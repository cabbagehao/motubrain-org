import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  loadPagePackDefinition,
  normalizeRepoPath,
} from '@/core/page-pack/manifest';

async function createPackFixture(options?: {
  packName?: string;
  managedPaths?: string[];
  messageNamespaces?: string[];
  previewRoutes?: Array<{
    previewUrl: string;
    sourcePage: string;
    previewRoute: string;
  }>;
  sourcePages?: string[];
  extraFiles?: Array<{ path: string; content?: string }>;
}) {
  const packName = options?.packName ?? 'sample-pack';
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'page-pack-'));
  const packRoot = path.join(repoRoot, 'page-packs', packName);
  const previewRoot = path.join(packRoot, 'preview');
  const sourceRoot = path.join(packRoot, 'source');

  await mkdir(previewRoot, { recursive: true });
  await mkdir(sourceRoot, { recursive: true });

  const sourcePages = options?.sourcePages ?? ['src/app/[locale]/(landing)/page.tsx'];
  for (const sourcePage of sourcePages) {
    const fullPath = path.join(sourceRoot, sourcePage);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, 'export default function Page(){return null;}');
  }

  const previewRoutes =
    options?.previewRoutes ??
    sourcePages.map((sourcePage, index) => ({
      previewUrl: index === 0 ? `/preview/packs/${packName}` : `/preview/packs/${packName}/${index}`,
      sourcePage,
      previewRoute:
        index === 0 ? 'routes/home/page.tsx' : `routes/${index}/page.tsx`,
    }));

  for (const route of previewRoutes) {
    const fullPath = path.join(previewRoot, route.previewRoute);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(
      fullPath,
      `export { default } from '../../source/${route.sourcePage.replace(/^src\//, 'src/')}'`
    );
  }

  await writeFile(
    path.join(previewRoot, 'routes.json'),
    JSON.stringify({ routes: previewRoutes }, null, 2)
  );

  await writeFile(
    path.join(packRoot, 'pack.json'),
    JSON.stringify(
      {
        name: packName,
        title: 'Sample Pack',
        description: 'Sample',
        version: 1,
        ...(options?.messageNamespaces
          ? { messageNamespaces: options.messageNamespaces }
          : {}),
        managedPaths:
          options?.managedPaths ?? [
            'src/app/[locale]/(landing)/page.tsx',
            `public/packs/${packName}`,
          ],
      },
      null,
      2
    )
  );

  for (const file of options?.extraFiles ?? []) {
    const fullPath = path.join(sourceRoot, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content ?? '{}');
  }

  return {
    repoRoot,
    packName,
    async cleanup() {
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

test('normalizeRepoPath canonicalizes separators and rejects traversal', () => {
  assert.equal(normalizeRepoPath('src\\app\\[locale]\\page.tsx'), 'src/app/[locale]/page.tsx');
  assert.throws(() => normalizeRepoPath('../secrets.txt'));
  assert.throws(() => normalizeRepoPath('/abs/path'));
});

test('loadPagePackDefinition reads a valid static pack definition', async () => {
  const fixture = await createPackFixture({
    managedPaths: [
      'src/app/[locale]/(landing)/page.tsx',
      'src/config/locale/messages/en/landing.json',
      'public/packs/sample-pack',
    ],
    extraFiles: [
      {
        path: 'src/config/locale/messages/en/landing.json',
        content: '{}',
      },
    ],
  });

  try {
    const definition = await loadPagePackDefinition({
      repoRoot: fixture.repoRoot,
      packName: fixture.packName,
    });

    assert.equal(definition.manifest.name, 'sample-pack');
    assert.deepEqual(definition.sourcePages, ['src/app/[locale]/(landing)/page.tsx']);
  } finally {
    await fixture.cleanup();
  }
});

test('loadPagePackDefinition rejects managed directories outside public namespace', async () => {
  const fixture = await createPackFixture({
    managedPaths: ['src/app/[locale]/(landing)'],
  });

  try {
    await assert.rejects(
      () =>
        loadPagePackDefinition({
          repoRoot: fixture.repoRoot,
          packName: fixture.packName,
        }),
      /page\.tsx/i
    );
  } finally {
    await fixture.cleanup();
  }
});

test('loadPagePackDefinition rejects message namespaces outside localeMessagesPaths', async () => {
  const fixture = await createPackFixture({
    managedPaths: [
      'src/app/[locale]/(landing)/page.tsx',
      'src/config/locale/messages/en/pages/new-namespace.json',
    ],
    extraFiles: [
      {
        path: 'src/config/locale/messages/en/pages/new-namespace.json',
        content: '{}',
      },
    ],
  });

  try {
    await assert.rejects(
      () =>
        loadPagePackDefinition({
          repoRoot: fixture.repoRoot,
          packName: fixture.packName,
        }),
      /namespace/i
    );
  } finally {
    await fixture.cleanup();
  }
});

test('loadPagePackDefinition allows message namespaces declared by the pack', async () => {
  const fixture = await createPackFixture({
    messageNamespaces: ['pages/new-namespace'],
    managedPaths: [
      'src/app/[locale]/(landing)/page.tsx',
      'src/config/locale/messages/en/pages/new-namespace.json',
      'src/config/locale/messages/zh/pages/new-namespace.json',
    ],
    extraFiles: [
      {
        path: 'src/config/locale/messages/en/pages/new-namespace.json',
        content: '{}',
      },
      {
        path: 'src/config/locale/messages/zh/pages/new-namespace.json',
        content: '{}',
      },
    ],
  });

  try {
    const definition = await loadPagePackDefinition({
      repoRoot: fixture.repoRoot,
      packName: fixture.packName,
    });

    assert.deepEqual(definition.manifest.messageNamespaces, [
      'pages/new-namespace',
    ]);
  } finally {
    await fixture.cleanup();
  }
});

test('loadPagePackDefinition requires preview coverage for every static source page', async () => {
  const fixture = await createPackFixture({
    managedPaths: [
      'src/app/[locale]/(landing)/page.tsx',
      'src/app/[locale]/(landing)/create/page.tsx',
      'public/packs/sample-pack',
    ],
    sourcePages: [
      'src/app/[locale]/(landing)/page.tsx',
      'src/app/[locale]/(landing)/create/page.tsx',
    ],
    previewRoutes: [
      {
        previewUrl: '/preview/packs/sample-pack',
        sourcePage: 'src/app/[locale]/(landing)/page.tsx',
        previewRoute: 'routes/home/page.tsx',
      },
    ],
  });

  try {
    await assert.rejects(
      () =>
        loadPagePackDefinition({
          repoRoot: fixture.repoRoot,
          packName: fixture.packName,
        }),
      /preview/i
    );
  } finally {
    await fixture.cleanup();
  }
});
