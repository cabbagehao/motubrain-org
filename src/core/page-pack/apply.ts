import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadPagePackDefinition, normalizeRepoPath } from './manifest';

async function walk(relativeRoot: string, absoluteRoot: string): Promise<string[]> {
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeRoot
      ? `${relativeRoot}/${entry.name}`
      : entry.name;
    const absolutePath = path.join(absoluteRoot, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(relativePath, absolutePath)));
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

async function removeManagedTarget(repoRoot: string, managedPath: string) {
  await rm(path.join(repoRoot, managedPath), {
    recursive: true,
    force: true,
  });
}

async function copySourceTree(sourceRoot: string, repoRoot: string) {
  const files = await walk('', sourceRoot);

  for (const relativeFile of files) {
    const targetPath = path.join(repoRoot, normalizeRepoPath(relativeFile));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(path.join(sourceRoot, relativeFile), targetPath);
  }
}

async function addLocaleMessageNamespaces(
  repoRoot: string,
  namespaces: string[] | undefined
) {
  if (!namespaces || namespaces.length === 0) {
    return;
  }

  const configPath = path.join(repoRoot, 'src/config/locale/index.ts');
  const content = await readFile(configPath, 'utf8');
  const match = content.match(
    /export const localeMessagesPaths = \[([\s\S]*?)\];/
  );

  if (!match) {
    throw new Error('Unable to find localeMessagesPaths in locale config');
  }

  const existing = Array.from(
    match[1].matchAll(/['"]([^'"]+)['"]/g),
    (entry) => entry[1]
  );
  const merged = Array.from(new Set([...existing, ...namespaces]));

  if (merged.length === existing.length) {
    return;
  }

  const nextArray = `export const localeMessagesPaths = [\n${merged
    .map((namespace) => `  '${namespace}',`)
    .join('\n')}\n];`;

  await writeFile(
    configPath,
    content.replace(
      /export const localeMessagesPaths = \[[\s\S]*?\];/,
      nextArray
    )
  );
}

export async function applyPagePack(args: {
  repoRoot: string;
  packName: string;
}) {
  const definition = await loadPagePackDefinition(args);

  for (const managedPath of definition.manifest.managedPaths) {
    await removeManagedTarget(args.repoRoot, managedPath);
  }

  await copySourceTree(definition.sourceRoot, args.repoRoot);
  await addLocaleMessageNamespaces(
    args.repoRoot,
    definition.manifest.messageNamespaces
  );

  return definition;
}
