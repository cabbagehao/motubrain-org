import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPageMetadata, resolveMetadataKeywords } from '@/shared/lib/seo';

test('resolveMetadataKeywords stays empty by default and keeps an explicit primary keyword only', () => {
  assert.equal(resolveMetadataKeywords(), undefined);
  assert.equal(resolveMetadataKeywords('   '), undefined);
  assert.equal(resolveMetadataKeywords('ai outfit generator'), 'ai outfit generator');
});

test('buildPageMetadata keeps og and twitter metadata aligned with page metadata', () => {
  const metadata = buildPageMetadata({
    title: 'Template Feature Page',
    description:
      'Use this template feature page metadata helper to keep canonical, open graph, and twitter metadata aligned.',
    canonicalUrl: 'https://example.com/feature',
    locale: 'en',
  });

  assert.equal(metadata.title, 'Template Feature Page');
  assert.equal(metadata.openGraph?.title, 'Template Feature Page');
  assert.equal(
    metadata.openGraph?.description,
    'Use this template feature page metadata helper to keep canonical, open graph, and twitter metadata aligned.'
  );
  assert.equal(metadata.openGraph?.url, 'https://example.com/feature');
  assert.equal(metadata.twitter?.title, 'Template Feature Page');
  assert.equal(
    metadata.twitter?.description,
    'Use this template feature page metadata helper to keep canonical, open graph, and twitter metadata aligned.'
  );
});

test('buildPageMetadata leaves meta keywords empty unless an explicit primary keyword is passed', () => {
  const defaultMetadata = buildPageMetadata({
    title: 'Template Feature Page',
    description: 'Metadata should stay empty by default for meta keywords.',
    canonicalUrl: 'https://example.com/feature',
    locale: 'en',
  });

  const explicitKeywordMetadata = buildPageMetadata({
    title: 'Template Feature Page',
    description: 'Metadata should preserve an explicit primary keyword when requested.',
    canonicalUrl: 'https://example.com/feature',
    locale: 'en',
    keywords: 'ai outfit generator',
  });

  assert.equal(defaultMetadata.keywords, undefined);
  assert.equal(explicitKeywordMetadata.keywords, 'ai outfit generator');
});
