import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadPagePackDefinition } from '@/core/page-pack/manifest';
import { buildPreviewRegistryKey } from '@/core/page-pack/registry';

async function main() {
  const repoRoot = process.cwd();
  const pagePacksRoot = path.join(repoRoot, 'page-packs');
  const outputPath = path.join(
    repoRoot,
    'src/core/page-pack/generated/preview-registry.ts'
  );

  let packNames: string[] = [];
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(pagePacksRoot, { withFileTypes: true });
    packNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const imports: string[] = [
    "import { buildPreviewRegistryKey, type PreviewRegistryEntry } from '@/core/page-pack/registry';",
  ];
  const registryEntries: string[] = [];
  let importIndex = 0;

  for (const packName of packNames) {
    const definition = await loadPagePackDefinition({ repoRoot, packName });

    for (const route of definition.preview.routes) {
      const importName = `PreviewRoute${importIndex++}`;
      const importPath = path.posix
        .relative(
          path.posix.join('src/core/page-pack/generated'),
          path.posix.join('page-packs', packName, 'preview', route.previewRoute)
        )
        .replace(/\.tsx$/, '')
        .replace(/\\/g, '/');
      const normalizedImportPath = importPath.startsWith('.')
        ? importPath
        : `./${importPath}`;
      const layoutKind = route.sourcePage.includes('/(landing)/')
        ? 'landing'
        : 'plain';

      imports.push(`import ${importName} from '${normalizedImportPath}';`);
      registryEntries.push(
        `  [buildPreviewRegistryKey(${JSON.stringify(packName)}, ${JSON.stringify(route.previewUrl)})]: {` +
          ` packName: ${JSON.stringify(packName)},` +
          ` previewUrl: ${JSON.stringify(route.previewUrl)},` +
          ` sourcePage: ${JSON.stringify(route.sourcePage)},` +
          ` previewRoute: ${JSON.stringify(route.previewRoute)},` +
          ` layoutKind: ${JSON.stringify(layoutKind)},` +
          ` component: ${importName}` +
          ' }'
      );
    }
  }

  const fileContents = `${imports.join('\n')}

const registry = new Map<string, PreviewRegistryEntry>(
  Object.entries({
${registryEntries.join(',\n')}
  })
);

export function getPreviewRegistryEntry(
  packName: string,
  previewUrl: string
): PreviewRegistryEntry | null {
  return registry.get(buildPreviewRegistryKey(packName, previewUrl)) ?? null;
}
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, fileContents);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
