import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { localeMessagesPaths } from '@/config/locale';

import {
  PagePackDefinition,
  PagePackManifest,
  PagePackPreviewManifest,
} from './types';

const APP_PREFIX = 'src/app/[locale]/';
const MESSAGE_PREFIX = 'src/config/locale/messages/';
const PUBLIC_PREFIX = 'public/packs/';
const DYNAMIC_SEGMENT_RE = /\[\[?\.\.\.[^\]]+\]\]?|\[[^\]]+\]/;

const REJECTED_APP_PATTERNS = [
  /^src\/app\/\[locale\]\/preview\//,
  /\/layout\.tsx$/,
  /\/template\.tsx$/,
  /\/loading\.tsx$/,
  /\/error\.tsx$/,
  /\/not-found\.tsx$/,
  /\/route\.ts$/,
  /^src\/app\/api\//,
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

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

export function normalizeRepoPath(input: string): string {
  const normalized = input.replace(/\\/g, '/');

  if (!normalized || path.posix.isAbsolute(normalized)) {
    throw new Error(`Invalid repo path: ${input}`);
  }

  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid repo path traversal: ${input}`);
  }

  return parts.join('/');
}

function isPreviewUrlForPack(previewUrl: string, packName: string): boolean {
  return previewUrl === `/preview/packs/${packName}` ||
    previewUrl.startsWith(`/preview/packs/${packName}/`);
}

function getMessageNamespace(repoPath: string): string | null {
  if (!repoPath.startsWith(MESSAGE_PREFIX)) {
    return null;
  }

  const match = repoPath.match(
    /^src\/config\/locale\/messages\/[^/]+\/(.+)\.json$/
  );

  return match?.[1] ?? null;
}

function validateMessageNamespace(namespace: string) {
  const normalized = normalizeRepoPath(namespace);

  if (normalized.endsWith('.json') || normalized.startsWith('src/')) {
    throw new Error(`Invalid message namespace: ${namespace}`);
  }

  return normalized;
}

function validateManagedPath(
  repoPath: string,
  packName: string,
  packMessageNamespaces: Set<string>
) {
  if (repoPath.startsWith(APP_PREFIX)) {
    if (repoPath.endsWith('/')) {
      throw new Error(`managedPaths must not contain directory app paths: ${repoPath}`);
    }

    if (REJECTED_APP_PATTERNS.some((pattern) => pattern.test(repoPath))) {
      throw new Error(`managedPaths contains forbidden app path: ${repoPath}`);
    }

    if (!repoPath.endsWith('/page.tsx')) {
      throw new Error(`App managed path must target page.tsx: ${repoPath}`);
    }

    return;
  }

  if (repoPath.startsWith(MESSAGE_PREFIX)) {
    const namespace = getMessageNamespace(repoPath);
    if (
      !namespace ||
      (!localeMessagesPaths.includes(namespace) &&
        !packMessageNamespaces.has(namespace))
    ) {
      throw new Error(`Unsupported message namespace: ${repoPath}`);
    }

    return;
  }

  if (repoPath === `${PUBLIC_PREFIX}${packName}`) {
    return;
  }

  throw new Error(`managedPaths contains unsupported path: ${repoPath}`);
}

function ensureCoveredByManagedPaths(repoPath: string, managedPaths: string[]) {
  const covered = managedPaths.some((managedPath) => {
    if (managedPath === repoPath) {
      return true;
    }

    return managedPath.startsWith(PUBLIC_PREFIX) && repoPath.startsWith(`${managedPath}/`);
  });

  if (!covered) {
    throw new Error(`Source file is not covered by managedPaths: ${repoPath}`);
  }
}

async function discoverSourcePages(sourceRoot: string): Promise<string[]> {
  const appRoot = path.join(sourceRoot, 'src/app/[locale]');
  const files = await walk('src/app/[locale]', appRoot);

  return files
    .filter((file) => file.endsWith('/page.tsx'))
    .filter((file) => !DYNAMIC_SEGMENT_RE.test(file.slice(APP_PREFIX.length)))
    .sort();
}

function validatePreviewManifest(
  preview: PagePackPreviewManifest,
  packName: string,
  sourcePages: string[]
) {
  if (!isObject(preview) || !Array.isArray(preview.routes) || preview.routes.length === 0) {
    throw new Error('preview/routes.json must declare at least one route');
  }

  const sourcePageSet = new Set(sourcePages);
  const seenSourcePages = new Set<string>();

  for (const route of preview.routes) {
    if (!isObject(route)) {
      throw new Error('preview route entry must be an object');
    }

    const previewUrl = route.previewUrl;
    const sourcePage = route.sourcePage;
    const previewRoute = route.previewRoute;

    if (
      typeof previewUrl !== 'string' ||
      typeof sourcePage !== 'string' ||
      typeof previewRoute !== 'string'
    ) {
      throw new Error('preview route entry is missing required fields');
    }

    const normalizedSourcePage = normalizeRepoPath(sourcePage);
    const normalizedPreviewRoute = normalizeRepoPath(previewRoute);

    if (!isPreviewUrlForPack(previewUrl, packName)) {
      throw new Error(`previewUrl is outside pack namespace: ${previewUrl}`);
    }

    if (!normalizedSourcePage.startsWith(APP_PREFIX) || !normalizedSourcePage.endsWith('/page.tsx')) {
      throw new Error(`preview sourcePage must point to a static page.tsx file: ${sourcePage}`);
    }

    if (!normalizedPreviewRoute.startsWith('routes/') || !normalizedPreviewRoute.endsWith('/page.tsx')) {
      throw new Error(`previewRoute must live under preview/routes: ${previewRoute}`);
    }

    if (!sourcePageSet.has(normalizedSourcePage)) {
      throw new Error(`preview route points to missing source page: ${sourcePage}`);
    }

    if (seenSourcePages.has(normalizedSourcePage)) {
      throw new Error(`duplicate preview coverage for source page: ${sourcePage}`);
    }

    seenSourcePages.add(normalizedSourcePage);
  }

  if (seenSourcePages.size !== sourcePageSet.size) {
    throw new Error('preview/routes.json must cover every static source page');
  }
}

export async function loadPagePackDefinition(args: {
  repoRoot: string;
  packName: string;
}): Promise<PagePackDefinition> {
  const packName = normalizeRepoPath(args.packName);
  const packRoot = path.join(args.repoRoot, 'page-packs', packName);
  const previewRoot = path.join(packRoot, 'preview');
  const sourceRoot = path.join(packRoot, 'source');

  const manifest = await readJsonFile<PagePackManifest>(
    path.join(packRoot, 'pack.json')
  );
  const preview = await readJsonFile<PagePackPreviewManifest>(
    path.join(previewRoot, 'routes.json')
  );

  if (!isObject(manifest) || manifest.name !== packName) {
    throw new Error(`pack.json name must match pack directory: ${packName}`);
  }

  if (!Array.isArray(manifest.managedPaths) || manifest.managedPaths.length === 0) {
    throw new Error('pack.json must declare managedPaths');
  }

  const messageNamespaces = Array.isArray(manifest.messageNamespaces)
    ? manifest.messageNamespaces.map(validateMessageNamespace)
    : [];
  const packMessageNamespaces = new Set(messageNamespaces);

  const normalizedManagedPaths = manifest.managedPaths.map((managedPath) => {
    const normalized = normalizeRepoPath(managedPath);
    validateManagedPath(normalized, packName, packMessageNamespaces);
    return normalized;
  });

  const sourceFiles = await walk('', sourceRoot);
  for (const file of sourceFiles) {
    ensureCoveredByManagedPaths(normalizeRepoPath(file), normalizedManagedPaths);
  }

  const sourcePages = await discoverSourcePages(sourceRoot);
  validatePreviewManifest(preview, packName, sourcePages);

  return {
    packRoot,
    previewRoot,
    sourceRoot,
    manifest: {
      ...manifest,
      messageNamespaces,
      managedPaths: normalizedManagedPaths,
    },
    preview,
    sourcePages,
  };
}
