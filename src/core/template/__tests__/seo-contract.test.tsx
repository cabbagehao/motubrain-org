import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { getAlternateLanguageUrls } from '@/shared/lib/seo';

test('template serves robots from the metadata route only', () => {
  assert.equal(existsSync('src/app/robots.ts'), true);
  assert.equal(
    existsSync('public/robots.txt'),
    false,
    'public/robots.txt conflicts with src/app/robots.ts and should be removed'
  );
});

test('single-locale sites omit hreflang alternate links', () => {
  assert.equal(getAlternateLanguageUrls('/'), undefined);
});

test('root layout does not inject a second manual alternate-link cluster', () => {
  const source = readFileSync('src/app/layout.tsx', 'utf8');

  assert.doesNotMatch(source, /rel="alternate"/);
});

test('root layout does not inject a manual viewport meta tag', () => {
  const source = readFileSync('src/app/layout.tsx', 'utf8');

  assert.doesNotMatch(source, /<meta name="viewport"/);
});

test('dynamic page does not auto-inject a hidden h1 from page.title', () => {
  const source = readFileSync('src/themes/default/pages/dynamic-page.tsx', 'utf8');

  assert.doesNotMatch(source, /page\.title\s*&&\s*!page\.sections\?\.hero/);
});

test('dynamic page does not support a page-level sr-only title field', () => {
  const source = readFileSync('src/themes/default/pages/dynamic-page.tsx', 'utf8');
  const types = readFileSync('src/shared/types/blocks/landing.d.ts', 'utf8');

  assert.doesNotMatch(source, /page\.sr_only_title/);
  assert.doesNotMatch(types, /export interface DynamicPage \{[\s\S]*sr_only_title\?:/);
});

test('footer legal links keep the canonical bare-path hrefs', () => {
  const source = readFileSync('src/themes/default/blocks/footer.tsx', 'utf8');

  assert.doesNotMatch(source, /locale=\s*\{\s*isEnglishOnlyPageSlug/);
});
