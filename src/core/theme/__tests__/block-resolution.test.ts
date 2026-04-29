import assert from 'node:assert/strict';
import test from 'node:test';

import { getThemeBlock } from '@/core/theme';

test('getThemeBlock resolves all-uppercase acronym block exports', async () => {
  const FAQBlock = await getThemeBlock('faq');
  const CTABlock = await getThemeBlock('cta');

  assert.equal(FAQBlock.name, 'FAQ');
  assert.equal(CTABlock.name, 'CTA');
});
