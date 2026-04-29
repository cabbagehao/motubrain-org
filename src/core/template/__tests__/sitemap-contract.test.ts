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
    '/privacy-policy',
    '/terms-of-service',
  ]);
});
