import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ensureIndexNowSetup,
  getIndexNowKey,
  getIndexNowKeyLocation,
  getSiteUrl,
  parseSitemapUrls,
} from '../indexnow-config';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'indexnow-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('ensureIndexNowSetup generates a key, writes it to .env, and creates the public key file', async () => {
  await withTempDir(async (dir) => {
    await ensureIndexNowSetup({
      rootDir: dir,
      envContent: 'NEXT_PUBLIC_APP_URL = "https://example.com"\n',
      randomKey: () => '0123456789abcdef0123456789abcdef',
    });

    const env = await readFile(path.join(dir, '.env'), 'utf8');
    const keyFile = await readFile(
      path.join(dir, 'public/0123456789abcdef0123456789abcdef.txt'),
      'utf8'
    );

    assert.match(env, /INDEXNOW_KEY = "0123456789abcdef0123456789abcdef"/);
    assert.equal(keyFile, '0123456789abcdef0123456789abcdef\n');
  });
});

test('ensureIndexNowSetup is idempotent when INDEXNOW_KEY already exists', async () => {
  await withTempDir(async (dir) => {
    const first = await ensureIndexNowSetup({
      rootDir: dir,
      envContent:
        'NEXT_PUBLIC_APP_URL = "https://example.com"\nINDEXNOW_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\n',
      randomKey: () => 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });
    const second = await ensureIndexNowSetup({
      rootDir: dir,
      randomKey: () => 'cccccccccccccccccccccccccccccccc',
    });

    assert.equal(first.key, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(second.key, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(second.createdKey, false);
  });
});

test('submit helpers require an explicit IndexNow key and a non-local production URL', () => {
  assert.equal(
    getSiteUrl({
      INDEXNOW_SITE_URL: 'https://squareface-generator.xyz/',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }),
    'https://squareface-generator.xyz'
  );
  assert.throws(
    () => getSiteUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
    /production site URL/
  );
  assert.equal(
    getIndexNowKey({ INDEXNOW_KEY: '0123456789abcdef0123456789abcdef' }),
    '0123456789abcdef0123456789abcdef'
  );
  assert.throws(() => getIndexNowKey({}), /INDEXNOW_KEY/);
});

test('getIndexNowKeyLocation defaults to the root-hosted key file', () => {
  assert.equal(
    getIndexNowKeyLocation(
      'https://squareface-generator.xyz',
      '0123456789abcdef0123456789abcdef',
      {}
    ),
    'https://squareface-generator.xyz/0123456789abcdef0123456789abcdef.txt'
  );
});

test('parseSitemapUrls extracts unique sorted sitemap loc entries', () => {
  assert.deepEqual(
    parseSitemapUrls(`
      <urlset>
        <url><loc>https://example.com/b</loc></url>
        <url><loc>https://example.com/a</loc></url>
        <url><loc>https://example.com/a</loc></url>
      </urlset>
    `),
    ['https://example.com/a', 'https://example.com/b']
  );
});
