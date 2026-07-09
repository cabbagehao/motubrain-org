import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { getIndexablePagePaths } from '../../../shared/lib/sitemap';

test('default template sitemap is generated from the app router instead of a static public file', () => {
  assert.equal(
    existsSync('public/sitemap.xml'),
    false,
    'public/sitemap.xml should be removed so copied projects do not inherit stale sitemap entries'
  );
  assert.equal(
    existsSync('src/app/sitemap.ts'),
    true,
    'src/app/sitemap.ts should exist so copied projects start from a generated sitemap'
  );
});

test('default template sitemap includes the homepage and legal pages', () => {
  assert.deepEqual(getIndexablePagePaths(), [
    '/',
    '/access-status',
    '/benchmarks',
    '/imac14-2-opencore-legacy-patcher',
    '/macbookpro11-1-opencore-legacy-patcher',
    '/macos-sequoia-unsupported-mac',
    '/macos-sonoma-unsupported-mac',
    '/mcp-config-generator',
    '/mrpack-to-zip',
    '/odysseus-ai',
    '/opencore-legacy-patcher-compatibility',
    '/opencore-legacy-patcher-error',
    '/opencore-legacy-patcher-non-metal-gpu',
    '/opencore-legacy-patcher-wifi-bluetooth',
    '/pdf-to-markdown',
    '/privacy-policy',
    '/terms-of-service',
    '/world-action-model',
  ]);
});
