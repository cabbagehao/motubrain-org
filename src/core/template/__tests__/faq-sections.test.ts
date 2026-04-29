import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;

test('default homepage FAQ copy is present and bounded', () => {
  const files = [
    'src/config/locale/messages/en/landing.json',
    'page-packs/nano-banana-image-site/source/src/config/locale/messages/en/pages/index.json',
    'page-packs/nano-banana-image-site/source/src/config/locale/messages/zh/pages/index.json',
    'page-packs/shipany2-home/source/src/config/locale/messages/en/landing.json',
    'page-packs/shipany2-home/source/src/config/locale/messages/zh/landing.json',
  ];

  for (const file of files) {
    const data = readJson(file);
    const faq = data.faq ?? data.page?.sections?.faq;

    assert.ok(faq?.items?.length >= 3, `${file} should include FAQ items`);
    assert.ok(
      faq.items.length <= 6,
      `${file} should not exceed 6 default FAQ items`
    );
  }
});

test('showcases page renders the shared landing FAQ section', () => {
  const source = readFileSync(
    'page-packs/nano-banana-image-site/source/src/app/[locale]/(landing)/showcases/page.tsx',
    'utf8'
  );

  assert.match(source, /faq:\s*tl\.raw\('faq'\)/);
});

test('dynamic page block failures are not silently hidden', () => {
  const source = readFileSync('src/themes/default/pages/dynamic-page.tsx', 'utf8');

  assert.doesNotMatch(source, /catch\s*\([^)]*\)\s*{\s*return null;\s*}/);
  assert.match(source, /Failed to render dynamic page section/);
});
