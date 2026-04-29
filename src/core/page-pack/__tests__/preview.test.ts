import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  loadPackPreviewMessageNamespaces,
  loadPackPreviewMessages,
  parsePreviewRequestPath,
  rewritePreviewAssetUrls,
  toPreviewUrl,
} from '@/core/page-pack/preview';

async function createPreviewFixture() {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'page-pack-preview-'));
  const packRoot = path.join(repoRoot, 'page-packs', 'shipany2-home', 'source');
  const manifestPath = path.join(
    repoRoot,
    'page-packs',
    'shipany2-home',
    'pack.json'
  );
  const messagePath = path.join(
    packRoot,
    'src/config/locale/messages/en/landing.json'
  );

  await mkdir(path.dirname(messagePath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      name: 'shipany2-home',
      title: 'ShipAny2 Home',
      description: 'Sample',
      version: 1,
      messageNamespaces: ['landing', 'pages/pricing'],
      managedPaths: [],
    })
  );
  await writeFile(
    messagePath,
    JSON.stringify({
      hero: {
        image: '/packs/shipany2-home/hero.jpg',
      },
    })
  );

  return {
    repoRoot,
    async cleanup() {
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

test('parsePreviewRequestPath extracts pack name from default and non-default locale urls', () => {
  assert.deepEqual(parsePreviewRequestPath('/preview/packs/shipany2-home'), {
    packName: 'shipany2-home',
    previewUrl: '/preview/packs/shipany2-home',
  });

  assert.equal(parsePreviewRequestPath('/zh/preview/packs/shipany2-home/create'), null);

  assert.equal(parsePreviewRequestPath('/pricing'), null);
});

test('loadPackPreviewMessageNamespaces reads namespaces declared by the pack', async () => {
  const fixture = await createPreviewFixture();

  try {
    const result = await loadPackPreviewMessageNamespaces({
      repoRoot: fixture.repoRoot,
      packName: 'shipany2-home',
    });

    assert.deepEqual(result, ['landing', 'pages/pricing']);
  } finally {
    await fixture.cleanup();
  }
});

test('rewritePreviewAssetUrls rewrites pack asset urls for preview', () => {
  assert.deepEqual(
    rewritePreviewAssetUrls(
      {
        hero: {
          image: '/packs/shipany2-home/hero.jpg',
        },
      },
      { locale: 'en', packName: 'shipany2-home' }
    ),
    {
      hero: {
        image: '/preview/pack-assets/shipany2-home/hero.jpg',
      },
    }
  );

  assert.equal(
    toPreviewUrl('/preview/pack-assets/shipany2-home/hero.jpg', 'zh', 'en'),
    '/zh/preview/pack-assets/shipany2-home/hero.jpg'
  );
});

test('loadPackPreviewMessages prefers pack-local messages and rewrites asset urls', async () => {
  const fixture = await createPreviewFixture();

  try {
    const result = await loadPackPreviewMessages({
      repoRoot: fixture.repoRoot,
      packName: 'shipany2-home',
      locale: 'en',
      defaultLocale: 'en',
      namespace: 'landing',
    });

    assert.deepEqual(result, {
      hero: {
        image: '/preview/pack-assets/shipany2-home/hero.jpg',
      },
    });
  } finally {
    await fixture.cleanup();
  }
});

test('loadPackPreviewMessages returns null when pack namespace is absent', async () => {
  const fixture = await createPreviewFixture();

  try {
    const result = await loadPackPreviewMessages({
      repoRoot: fixture.repoRoot,
      packName: 'shipany2-home',
      locale: 'en',
      defaultLocale: 'en',
      namespace: 'pages/pricing',
    });

    assert.equal(result, null);
  } finally {
    await fixture.cleanup();
  }
});
