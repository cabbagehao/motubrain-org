import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { applyPagePack } from '@/core/page-pack/apply';

async function createApplyFixture() {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'page-pack-apply-'));
  const packRoot = path.join(repoRoot, 'page-packs', 'sample-pack');
  const sourceRoot = path.join(packRoot, 'source');
  const previewRoot = path.join(packRoot, 'preview');

  await mkdir(previewRoot, { recursive: true });
  await mkdir(sourceRoot, { recursive: true });

  await writeFile(
    path.join(packRoot, 'pack.json'),
    JSON.stringify(
      {
        name: 'sample-pack',
        title: 'Sample Pack',
        description: 'Sample',
        version: 1,
        messageNamespaces: ['pages/new-namespace'],
        managedPaths: [
          'src/app/[locale]/(landing)/page.tsx',
          'src/config/locale/messages/en/landing.json',
          'src/config/locale/messages/en/pages/new-namespace.json',
          'public/packs/sample-pack',
        ],
      },
      null,
      2
    )
  );

  await mkdir(path.join(previewRoot, 'routes/home'), { recursive: true });
  await writeFile(
    path.join(previewRoot, 'routes/home/page.tsx'),
    'export { default } from "../../../source/src/app/[locale]/(landing)/page";'
  );
  await writeFile(
    path.join(previewRoot, 'routes.json'),
    JSON.stringify(
      {
        routes: [
          {
            previewUrl: '/preview/packs/sample-pack',
            sourcePage: 'src/app/[locale]/(landing)/page.tsx',
            previewRoute: 'routes/home/page.tsx',
          },
        ],
      },
      null,
      2
    )
  );

  const sourcePagePath = path.join(
    sourceRoot,
    'src/app/[locale]/(landing)/page.tsx'
  );
  await mkdir(path.dirname(sourcePagePath), { recursive: true });
  await writeFile(sourcePagePath, 'export default function Page(){return "new";}');

  const sourceMessagePath = path.join(
    sourceRoot,
    'src/config/locale/messages/en/landing.json'
  );
  await mkdir(path.dirname(sourceMessagePath), { recursive: true });
  await writeFile(sourceMessagePath, '{"hero":{"title":"new"}}');

  const sourcePackMessagePath = path.join(
    sourceRoot,
    'src/config/locale/messages/en/pages/new-namespace.json'
  );
  await mkdir(path.dirname(sourcePackMessagePath), { recursive: true });
  await writeFile(sourcePackMessagePath, '{"page":{"title":"new namespace"}}');

  const sourceAssetPath = path.join(
    sourceRoot,
    'public/packs/sample-pack/hero.jpg'
  );
  await mkdir(path.dirname(sourceAssetPath), { recursive: true });
  await writeFile(sourceAssetPath, 'new-image');

  const livePagePath = path.join(repoRoot, 'src/app/[locale]/(landing)/page.tsx');
  await mkdir(path.dirname(livePagePath), { recursive: true });
  await writeFile(livePagePath, 'export default function Page(){return "old";}');

  const liveMessagePath = path.join(
    repoRoot,
    'src/config/locale/messages/en/landing.json'
  );
  await mkdir(path.dirname(liveMessagePath), { recursive: true });
  await writeFile(liveMessagePath, '{"hero":{"title":"old"}}');

  const localeConfigPath = path.join(repoRoot, 'src/config/locale/index.ts');
  await mkdir(path.dirname(localeConfigPath), { recursive: true });
  await writeFile(
    localeConfigPath,
    "export const localeMessagesPaths = [\n  'common',\n  'landing',\n];\n"
  );

  const staleAssetPath = path.join(repoRoot, 'public/packs/sample-pack/stale.jpg');
  await mkdir(path.dirname(staleAssetPath), { recursive: true });
  await writeFile(staleAssetPath, 'stale-image');

  return {
    repoRoot,
    async cleanup() {
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

test('applyPagePack replaces managed files and prunes stale public assets', async () => {
  const fixture = await createApplyFixture();

  try {
    await applyPagePack({
      repoRoot: fixture.repoRoot,
      packName: 'sample-pack',
    });

    assert.equal(
      await readFile(
        path.join(fixture.repoRoot, 'src/app/[locale]/(landing)/page.tsx'),
        'utf8'
      ),
      'export default function Page(){return "new";}'
    );

    assert.equal(
      await readFile(
        path.join(
          fixture.repoRoot,
          'src/config/locale/messages/en/landing.json'
        ),
        'utf8'
      ),
      '{"hero":{"title":"new"}}'
    );

    assert.equal(
      await readFile(
        path.join(fixture.repoRoot, 'public/packs/sample-pack/hero.jpg'),
        'utf8'
      ),
      'new-image'
    );

    assert.match(
      await readFile(
        path.join(fixture.repoRoot, 'src/config/locale/index.ts'),
        'utf8'
      ),
      /'pages\/new-namespace'/
    );

    await assert.rejects(() =>
      readFile(
        path.join(fixture.repoRoot, 'public/packs/sample-pack/stale.jpg'),
        'utf8'
      )
    );
  } finally {
    await fixture.cleanup();
  }
});
