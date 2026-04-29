import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  defaultLocale,
  isEnglishOnlyPageSlug,
  localeMessagesPaths,
  locales,
} from '@/config/locale';
import { getCanonicalUrl } from '@/shared/lib/seo';

function normalizeRoutePath(routePath: string) {
  if (!routePath || routePath === '/') {
    return '/';
  }

  const normalizedPath = routePath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/index$/, '')
    .replace(/\/+$/, '');

  return normalizedPath ? `/${normalizedPath}` : '/';
}

function getDynamicMessagePagePaths() {
  return localeMessagesPaths
    .filter((messagePath) => messagePath.startsWith('pages/'))
    .map((messagePath) =>
      normalizeRoutePath(messagePath.replace(/^pages\//, ''))
    );
}

function getContentPagePaths() {
  const pagesDir = path.join(process.cwd(), 'content', 'pages');

  if (!existsSync(pagesDir)) {
    return [];
  }

  const stack = [pagesDir];
  const paths = new Set<string>();

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !/\.(md|mdx)$/i.test(entry.name)) {
        continue;
      }

      const relativePath = path.relative(pagesDir, fullPath).replace(/\\/g, '/');
      const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, '');
      const withoutLocaleSuffix = withoutExtension.replace(/\.[a-z-]+$/i, '');

      paths.add(normalizeRoutePath(withoutLocaleSuffix));
    }
  }

  return [...paths];
}

export function getIndexablePagePaths() {
  const seen = new Set<string>();
  const routePaths = ['/', ...getDynamicMessagePagePaths(), ...getContentPagePaths()];

  for (const routePath of routePaths) {
    seen.add(normalizeRoutePath(routePath));
  }

  return [...seen].sort((left, right) => {
    if (left === '/') return -1;
    if (right === '/') return 1;
    return left.localeCompare(right);
  });
}

export function buildSitemapEntriesForPaths({
  routePaths,
  locales: resolvedLocales = locales,
  defaultLocale: resolvedDefaultLocale = defaultLocale,
}: {
  routePaths: string[];
  locales?: string[];
  defaultLocale?: string;
}) {
  const normalizedPaths = [...new Set(routePaths.map(normalizeRoutePath))];

  return normalizedPaths.flatMap((routePath) => {
    const allowedLocales = isEnglishOnlyPageSlug(routePath)
      ? [resolvedDefaultLocale]
      : resolvedLocales;

    return allowedLocales.map((locale) => ({
      url: getCanonicalUrl(routePath, locale),
    }));
  });
}

export function getSitemapEntries() {
  return buildSitemapEntriesForPaths({
    routePaths: getIndexablePagePaths(),
  });
}
