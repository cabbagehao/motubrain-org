import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ENV_KEY = 'INDEXNOW_KEY';
const SAFE_INDEXNOW_KEY = /^[a-zA-Z0-9_-]{8,128}$/;

export interface EnvLike {
  [key: string]: string | undefined;
}

export interface EnsureIndexNowSetupOptions {
  rootDir?: string;
  envPath?: string;
  envContent?: string;
  randomKey?: () => string;
}

export interface EnsureIndexNowSetupResult {
  key: string;
  keyFilePath: string;
  createdKey: boolean;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalUrl(value: string): boolean {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

function parseEnvValue(source: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = source.match(pattern);
  const rawValue = match?.[1]?.trim();

  if (!rawValue) {
    return undefined;
  }

  return rawValue.replace(/^['"]|['"]$/g, '');
}

function upsertEnvValue(source: string, key: string, value: string): string {
  const line = `${key} = "${value}"`;
  const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');

  if (pattern.test(source)) {
    return source.replace(pattern, line);
  }

  const suffix = source.endsWith('\n') || source.length === 0 ? '' : '\n';
  return `${source}${suffix}\n# indexnow\n${line}\n`;
}

function assertSafeIndexNowKey(key: string): void {
  if (!SAFE_INDEXNOW_KEY.test(key)) {
    throw new Error(
      `${ENV_KEY} must be 8-128 characters and contain only letters, numbers, underscores, or hyphens.`
    );
  }
}

function generateIndexNowKey(): string {
  return randomBytes(16).toString('hex');
}

export function getSiteUrl(env: EnvLike = process.env): string {
  const configuredUrl = trimTrailingSlash(
    env.INDEXNOW_SITE_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim() || ''
  );

  if (!configuredUrl || isLocalUrl(configuredUrl)) {
    throw new Error(
      'IndexNow requires a production site URL. Set INDEXNOW_SITE_URL or NEXT_PUBLIC_APP_URL to the live HTTPS domain.'
    );
  }

  return configuredUrl;
}

export function getIndexNowKey(env: EnvLike = process.env): string {
  const key = env.INDEXNOW_KEY?.trim();

  if (!key) {
    throw new Error(
      `${ENV_KEY} is required. Run pnpm indexnow:setup before submitting URLs.`
    );
  }

  assertSafeIndexNowKey(key);
  return key;
}

export function getIndexNowKeyLocation(
  siteUrl: string,
  key: string,
  env: EnvLike = process.env
): string {
  return env.INDEXNOW_KEY_LOCATION?.trim() || `${siteUrl}/${key}.txt`;
}

export function parseSitemapUrls(xml: string): string[] {
  const locRegex = /<loc>(.*?)<\/loc>/g;
  const urls = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1]?.trim();
    if (url) {
      urls.add(url);
    }
  }

  return Array.from(urls).sort();
}

export async function ensureIndexNowSetup({
  rootDir = process.cwd(),
  envPath = '.env',
  envContent,
  randomKey = generateIndexNowKey,
}: EnsureIndexNowSetupOptions = {}): Promise<EnsureIndexNowSetupResult> {
  const fullEnvPath = path.join(rootDir, envPath);
  const source =
    envContent ??
    (await readFile(fullEnvPath, 'utf8').catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          return '';
        }
        throw error;
      }
    ));

  const existingKey = parseEnvValue(source, ENV_KEY);
  const key = existingKey || randomKey();
  assertSafeIndexNowKey(key);

  const nextEnv = upsertEnvValue(source, ENV_KEY, key);
  await writeFile(fullEnvPath, nextEnv);

  const publicDir = path.join(rootDir, 'public');
  await mkdir(publicDir, { recursive: true });
  const keyFilePath = path.join(publicDir, `${key}.txt`);
  await writeFile(keyFilePath, `${key}\n`);

  return {
    key,
    keyFilePath,
    createdKey: !existingKey,
  };
}
