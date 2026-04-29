import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSitemapEntriesForPaths } from '../../../shared/lib/sitemap';

test('buildSitemapEntriesForPaths expands public routes across locales and keeps legal pages english-only', () => {
  const entries = buildSitemapEntriesForPaths({
    routePaths: ['/', '/pricing', '/privacy-policy'],
    locales: ['en', 'fr'],
    defaultLocale: 'en',
  });

  assert.deepEqual(entries, [
    { url: 'https://test-domain.ai/' },
    { url: 'https://test-domain.ai/fr' },
    { url: 'https://test-domain.ai/pricing' },
    { url: 'https://test-domain.ai/fr/pricing' },
    { url: 'https://test-domain.ai/privacy-policy' },
  ]);
});
