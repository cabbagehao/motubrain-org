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

test('Motubrain homepage renders source and technical background sections', () => {
  const pageSource = readFileSync(
    'src/app/[locale]/(landing)/page.tsx',
    'utf8'
  );
  const featuresSource = readFileSync(
    'src/themes/default/blocks/features.tsx',
    'utf8'
  );
  const expectedSectionKeys = ['source_map', 'technical_background'];

  for (const sectionKey of expectedSectionKeys) {
    assert.match(
      pageSource,
      new RegExp(`['"]${sectionKey}['"]`),
      `landing page should include "${sectionKey}" in showSections`
    );
  }

  for (const locale of ['en', 'zh']) {
    const landing = readJson(
      `src/config/locale/messages/${locale}/landing.json`
    );

    for (const sectionKey of expectedSectionKeys) {
      assert.ok(
        landing[sectionKey]?.items?.length >= 3,
        `${locale} landing should include useful "${sectionKey}" items`
      );
    }

    assert.ok(
      landing.source_map.items.every(
        (item: Record<string, unknown>) =>
          typeof item.url === 'string' && item.url
      ),
      `${locale} source_map items should link to the referenced resources`
    );
  }

  assert.match(
    featuresSource,
    /item\.url/,
    'features block should render item links when configured'
  );
});

test('Motubrain homepage renders benchmark leaderboard screenshots', () => {
  const pageSource = readFileSync(
    'src/app/[locale]/(landing)/page.tsx',
    'utf8'
  );
  const registrySource = readFileSync('src/core/theme/registry.ts', 'utf8');
  const benchmarkBlockSource = readFileSync(
    'src/themes/default/blocks/benchmark-screenshots.tsx',
    'utf8'
  );
  const expectedImages = [
    'public/motubrain/robotwin-leaderboard.jpg',
    'public/motubrain/worldarena-leaderboard.png',
  ];
  const expectedLinks = [
    'https://robotwin-platform.github.io/leaderboard',
    'https://huggingface.co/spaces/WorldArena/WorldArena',
  ];

  assert.match(
    pageSource,
    /['"]benchmark_screenshots['"]/,
    'landing page should include benchmark_screenshots in showSections'
  );
  assert.match(
    registrySource,
    /benchmark-screenshots/,
    'theme registry should expose the benchmark screenshots block'
  );

  for (const imagePath of expectedImages) {
    assert.equal(existsSync(imagePath), true, `${imagePath} should exist`);
  }

  assert.match(
    benchmarkBlockSource,
    /DialogTrigger/,
    'benchmark screenshot images should open an enlarged preview dialog'
  );
  assert.match(
    benchmarkBlockSource,
    /width=\{item\.image\?\.width/,
    'benchmark dialog image should use source dimensions instead of upscaling a fill image'
  );
  assert.match(
    benchmarkBlockSource,
    /max-w-none/,
    'benchmark dialog image should not shrink to the dialog width'
  );
  assert.doesNotMatch(
    benchmarkBlockSource,
    /1120px/,
    'benchmark dialog should not use a narrow fixed max width'
  );
  assert.match(
    benchmarkBlockSource,
    /style=\{\{\s*width: item\.image\?\.width/,
    'benchmark dialog image should render at configured original width'
  );
  assert.match(
    benchmarkBlockSource,
    /place-items-center/,
    'benchmark dialog should center the original image in the viewport'
  );
  assert.match(
    benchmarkBlockSource,
    /sr-only/,
    'benchmark dialog should keep an accessible title without showing it'
  );
  assert.doesNotMatch(
    benchmarkBlockSource,
    /<DialogDescription>/,
    'benchmark dialog should show only the image, not visible descriptive text'
  );
  assert.match(
    benchmarkBlockSource,
    /item\.url/,
    'benchmark screenshot cards should render a source link'
  );
  assert.match(
    benchmarkBlockSource,
    /ExternalLink/,
    'benchmark screenshot source links should use an external-link icon'
  );
  assert.doesNotMatch(
    benchmarkBlockSource,
    /justify-between/,
    'benchmark screenshot titles should keep the source icon next to the text'
  );

  for (const locale of ['en', 'zh']) {
    const landing = readJson(
      `src/config/locale/messages/${locale}/landing.json`
    );
    const urls = landing.benchmark_screenshots?.items?.map(
      (item: Record<string, unknown>) => item.url
    );

    assert.equal(
      landing.benchmark_screenshots?.items?.length,
      2,
      `${locale} benchmark_screenshots should include two leaderboard images`
    );
    assert.deepEqual(
      landing.benchmark_screenshots?.items?.map(
        (item: Record<string, { width?: number; height?: number }>) => [
          item.image?.width,
          item.image?.height,
        ]
      ),
      [
        [1152, 604],
        [1280, 724],
      ],
      `${locale} benchmark_screenshots should record original screenshot dimensions`
    );
    assert.deepEqual(
      urls,
      expectedLinks,
      `${locale} benchmark_screenshots should link to benchmark source leaderboards`
    );
  }
});
