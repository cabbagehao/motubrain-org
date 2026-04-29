import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;

test('default landing config does not keep hidden sections in the base template', () => {
  const landing = readJson('src/config/locale/messages/en/landing.json');

  for (const [sectionKey, sectionValue] of Object.entries(landing)) {
    if (!sectionValue || typeof sectionValue !== 'object') {
      continue;
    }

    assert.notEqual(
      (sectionValue as Record<string, unknown>).hidden,
      true,
      `landing section "${sectionKey}" should be removed instead of hidden`
    );
  }
});

test('default template does not expose chat, docs, or ai generator public routes', () => {
  const removedRoutes = [
    'src/app/[locale]/(chat)/layout.tsx',
    'src/app/[locale]/(chat)/chat/page.tsx',
    'src/app/[locale]/(docs)/layout.tsx',
    'src/app/[locale]/(docs)/docs/[[...slug]]/page.tsx',
    'src/app/[locale]/(landing)/(ai)/ai-image-generator/page.tsx',
    'src/app/[locale]/(landing)/(ai)/ai-music-generator/page.tsx',
    'src/app/[locale]/(landing)/(ai)/ai-video-generator/page.tsx',
    'src/app/api/chat/route.ts',
    'src/app/api/chat/info/route.ts',
    'src/app/api/chat/list/route.ts',
    'src/app/api/chat/messages/route.ts',
    'src/app/api/chat/new/route.ts',
  ];

  for (const routePath of removedRoutes) {
    assert.equal(
      existsSync(routePath),
      false,
      `${routePath} should not exist in the default template`
    );
  }
});

test('default locale message registry excludes removed public route namespaces', () => {
  const source = readFileSync('src/config/locale/index.ts', 'utf8');

  assert.doesNotMatch(source, /'ai\/chat'/);
  assert.doesNotMatch(source, /'ai\/image'/);
  assert.doesNotMatch(source, /'ai\/music'/);
  assert.doesNotMatch(source, /'ai\/video'/);
});
