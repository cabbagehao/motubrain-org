import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { locales } from '@/config/locale';
import { PagePackManifest } from './types';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function parsePreviewRequestPath(pathname: string): {
  packName: string;
  previewUrl: string;
} | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);

  const localeOffset =
    segments[0] && locales.includes(segments[0]) ? 1 : 0;

  if (
    segments[localeOffset] !== 'preview' ||
    segments[localeOffset + 1] !== 'packs' ||
    !segments[localeOffset + 2]
  ) {
    return null;
  }

  const packName = segments[localeOffset + 2];
  const suffix = segments.slice(localeOffset + 3).join('/');
  const previewUrl = suffix
    ? `/preview/packs/${packName}/${suffix}`
    : `/preview/packs/${packName}`;

  return { packName, previewUrl };
}

export function toPreviewUrl(
  previewPath: string,
  locale: string,
  defaultLocale: string
): string {
  if (locale === defaultLocale) {
    return previewPath;
  }

  return `/${locale}${previewPath}`;
}

export function rewritePreviewAssetUrls<T extends JsonValue>(
  value: T,
  args: { locale: string; packName: string; defaultLocale?: string }
): T {
  const defaultLocale = args.defaultLocale ?? 'en';

  if (typeof value === 'string') {
    const prefix = `/packs/${args.packName}/`;
    if (!value.startsWith(prefix)) {
      return value;
    }

    const assetPath = value.slice(prefix.length);
    return `/preview/pack-assets/${args.packName}/${assetPath}` as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      rewritePreviewAssetUrls(item, args)
    ) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewritePreviewAssetUrls(entry as JsonValue, args),
      ])
    ) as T;
  }

  return value;
}

async function readPackMessageIfExists(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as JsonValue;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export async function loadPackPreviewMessageNamespaces(args: {
  repoRoot: string;
  packName: string;
}) {
  try {
    const manifestPath = path.join(
      args.repoRoot,
      'page-packs',
      args.packName,
      'pack.json'
    );
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8')
    ) as PagePackManifest;

    return Array.isArray(manifest.messageNamespaces)
      ? manifest.messageNamespaces
      : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function loadPackPreviewMessages(args: {
  repoRoot: string;
  packName: string;
  locale: string;
  defaultLocale: string;
  namespace: string;
}) {
  const localeCandidates =
    args.locale === args.defaultLocale
      ? [args.locale]
      : [args.locale, args.defaultLocale];

  for (const locale of localeCandidates) {
    const filePath = path.join(
      args.repoRoot,
      'page-packs',
      args.packName,
      'source',
      'src/config/locale/messages',
      locale,
      `${args.namespace}.json`
    );
    const message = await readPackMessageIfExists(filePath);

    if (message !== null) {
      return rewritePreviewAssetUrls(message, {
        locale: args.locale,
        defaultLocale: args.defaultLocale,
        packName: args.packName,
      });
    }
  }

  return null;
}
