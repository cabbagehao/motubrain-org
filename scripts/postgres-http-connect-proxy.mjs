#!/usr/bin/env node

import fs from 'node:fs';
import net from 'node:net';

function loadEnv(file = '.env') {
  const env = {};
  if (!fs.existsSync(file)) return env;

  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }

  return env;
}

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

const fileEnv = loadEnv(getArg('file') || '.env');
const databaseUrl = getArg('database-url') || process.env.DATABASE_URL || fileEnv.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Set it in .env or pass --database-url=...');
  process.exit(1);
}

const dbUrl = new URL(databaseUrl);
const localHost = getArg('local-host') || process.env.PG_PROXY_LOCAL_HOST || '127.0.0.1';
const localPort = Number(getArg('local-port') || process.env.PG_PROXY_LOCAL_PORT || 15432);
const proxyUrl = new URL(
  getArg('proxy') ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    'http://127.0.0.1:7890'
);

if (proxyUrl.protocol !== 'http:') {
  console.error(`Only HTTP CONNECT proxies are supported, got ${proxyUrl.protocol}`);
  process.exit(1);
}

const targetHost = getArg('target-host') || dbUrl.hostname;
const targetPort = Number(getArg('target-port') || dbUrl.port || 5432);

if (process.argv.includes('--print-url')) {
  dbUrl.hostname = localHost;
  dbUrl.port = String(localPort);
  dbUrl.searchParams.set('sslmode', 'require');
  console.log(dbUrl.toString());
  process.exit(0);
}

const server = net.createServer((client) => {
  const upstream = net.connect(Number(proxyUrl.port || 80), proxyUrl.hostname, () => {
    upstream.write(
      `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` +
        `Host: ${targetHost}:${targetPort}\r\n\r\n`
    );
  });

  let header = Buffer.alloc(0);
  let connected = false;

  upstream.on('data', (chunk) => {
    if (connected) {
      client.write(chunk);
      return;
    }

    header = Buffer.concat([header, chunk]);
    const idx = header.indexOf('\r\n\r\n');
    if (idx === -1) return;

    const head = header.slice(0, idx).toString('latin1');
    if (!/^HTTP\/1\.[01] 200\b/.test(head)) {
      client.destroy(new Error(`proxy CONNECT failed: ${head.split('\r\n')[0] || head}`));
      upstream.destroy();
      return;
    }

    connected = true;
    const rest = header.slice(idx + 4);
    if (rest.length) client.write(rest);
    client.pipe(upstream);
  });

  const close = () => {
    client.destroy();
    upstream.destroy();
  };

  client.on('error', close);
  upstream.on('error', close);
  client.on('close', () => upstream.destroy());
  upstream.on('close', () => client.destroy());
});

server.listen(localPort, localHost, () => {
  console.log(
    `postgres proxy listening on ${localHost}:${localPort} -> ${proxyUrl.hostname}:${proxyUrl.port || 80} -> ${targetHost}:${targetPort}`
  );
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
