import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

function resolveProxyUrl() {
  return (
    process.env.NODE_FETCH_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    ''
  );
}

function shouldBypassProxy(input: string | URL) {
  const hostname = new URL(input.toString()).hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  );
}

function headersToCurlArgs(headers?: HeadersInit) {
  if (!headers) {
    return [];
  }

  const normalized = new Headers(headers);
  const args: string[] = [];
  for (const [key, value] of normalized.entries()) {
    args.push('-H', `${key}: ${value}`);
  }
  return args;
}

async function fetchWithCurlProxy(
  input: string | URL,
  init: RequestInit,
  proxyUrl: string
) {
  const method = init.method || 'GET';
  const args = [
    '-sS',
    '-L',
    '--max-time',
    process.env.NODE_FETCH_PROXY_TIMEOUT_SECONDS || '30',
    '--proxy',
    proxyUrl,
    '-X',
    method,
    ...headersToCurlArgs(init.headers),
  ];

  if (init.body !== undefined) {
    if (typeof init.body !== 'string') {
      throw new Error(
        'fetchWithNodeProxy curl fallback only supports string bodies.'
      );
    }
    args.push('--data', init.body);
  }

  args.push('-w', '\n__HTTP_STATUS__:%{http_code}');
  args.push(input.toString());

  const { stdout } = await execFile('curl', args, {
    env: process.env,
    maxBuffer: 1024 * 1024 * 10,
  });

  const marker = '\n__HTTP_STATUS__:';
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error(
      'curl proxy fetch response did not include a status marker.'
    );
  }

  const body = stdout.slice(0, markerIndex);
  const status = Number(stdout.slice(markerIndex + marker.length).trim());
  if (!Number.isFinite(status)) {
    throw new Error(
      'curl proxy fetch response included an invalid HTTP status.'
    );
  }

  return new Response(body, { status });
}

export function fetchWithNodeProxy(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const proxyUrl = resolveProxyUrl();
  if (proxyUrl && !shouldBypassProxy(input)) {
    return fetchWithCurlProxy(input, init || {}, proxyUrl);
  }

  return fetch(input, init);
}
