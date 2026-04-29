import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  englishOnlyPageSlugs,
  getEnglishOnlyRedirectPathname,
  isEnglishOnlyPageSlug,
} from '../../../config/locale';

test('english-only legal pages stay centralized in locale config', () => {
  assert.deepEqual(englishOnlyPageSlugs, [
    'privacy-policy',
    'terms-of-service',
  ]);

  assert.equal(isEnglishOnlyPageSlug('privacy-policy'), true);
  assert.equal(isEnglishOnlyPageSlug('/terms-of-service'), true);
  assert.equal(isEnglishOnlyPageSlug('pricing'), false);

  assert.equal(
    getEnglishOnlyRedirectPathname('/fil/privacy-policy', 'fil'),
    '/privacy-policy'
  );
  assert.equal(
    getEnglishOnlyRedirectPathname('/my/terms-of-service', 'my'),
    '/terms-of-service'
  );
  assert.equal(getEnglishOnlyRedirectPathname('/privacy-policy', 'en'), '');
  assert.equal(getEnglishOnlyRedirectPathname('/fil/pricing', 'fil'), '');
});

test('i18n proxy keeps alternate link headers disabled', () => {
  const source = readFileSync('src/core/i18n/config.ts', 'utf8');

  assert.match(source, /alternateLinks:\s*false/);
});
