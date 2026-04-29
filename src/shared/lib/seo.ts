import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';

import { envConfigs } from '@/config';
import {
  defaultLocale,
  getEnglishOnlyRedirectPathname,
  locales,
} from '@/config/locale';

type BuildPageMetadataInput = {
  title: string;
  description: string;
  canonicalUrl: string;
  locale: string;
  keywords?: string;
  alternateLanguages?: Record<string, string> | undefined;
  imageUrl?: string;
  appName?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  canonicalUrl,
  locale,
  keywords,
  alternateLanguages,
  imageUrl,
  appName,
  noIndex,
}: BuildPageMetadataInput) {
  let resolvedImageUrl = imageUrl || envConfigs.app_preview_image;
  if (!resolvedImageUrl.startsWith('http')) {
    resolvedImageUrl = `${envConfigs.app_url}${resolvedImageUrl}`;
  }

  const resolvedAppName = appName || envConfigs.app_name || '';

  return {
    title,
    description,
    keywords: resolveMetadataKeywords(keywords),
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonicalUrl,
      title,
      description,
      siteName: resolvedAppName,
      images: [resolvedImageUrl.toString()],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolvedImageUrl.toString()],
      site: envConfigs.app_url,
    },
    robots: {
      index: noIndex ? false : true,
      follow: noIndex ? false : true,
    },
  };
}

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const pathname = (await headers()).get('x-pathname') || '';
    const englishOnlyPath = getEnglishOnlyRedirectPathname(pathname, locale);

    // passed metadata
    const passedMetadata = {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    let translatedMetadata: any = {};
    if (options.metadataKey) {
      translatedMetadata = await getTranslatedMetadata(
        options.metadataKey,
        locale
      );
    }

    // canonical url
    const canonicalTarget = englishOnlyPath || options.canonicalUrl || '';
    const canonicalLocale = englishOnlyPath ? defaultLocale : locale || '';
    const canonicalUrl = getCanonicalUrl(canonicalTarget, canonicalLocale);
    const alternateLanguages = englishOnlyPath
      ? locales.length > 1
        ? {
            [defaultLocale]: canonicalUrl,
            'x-default': canonicalUrl,
          }
        : undefined
      : getAlternateLanguageUrls(canonicalTarget);

    const title =
      passedMetadata.title || translatedMetadata.title || defaultMetadata.title;
    const description =
      passedMetadata.description ||
      translatedMetadata.description ||
      defaultMetadata.description;

    return buildPageMetadata({
      title,
      description,
      keywords: passedMetadata.keywords,
      canonicalUrl,
      alternateLanguages,
      imageUrl: options.imageUrl,
      appName: options.appName,
      locale,
      noIndex: options.noIndex,
    });
  };
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  setRequestLocale(locale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? t('title') : '',
    description: t.has('description') ? t('description') : '',
  };
}

export function resolveMetadataKeywords(keywords?: string) {
  // Leave meta keywords empty by default; modern search engines do not use this field for ranking,
  // so only keep an explicitly supplied page primary keyword when a page intentionally wants it.
  const normalizedKeywords = keywords?.trim();
  return normalizedKeywords ? normalizedKeywords : undefined;
}

function normalizeCanonicalPath(canonicalUrl: string) {
  if (!canonicalUrl) {
    return '/';
  }

  if (canonicalUrl.startsWith('http')) {
    const url = new URL(canonicalUrl);
    return `${url.pathname}${url.search}` || '/';
  }

  return canonicalUrl.startsWith('/') ? canonicalUrl : `/${canonicalUrl}`;
}

function getLocalizedUrl(pathname: string, locale: string) {
  let canonicalUrl = `${envConfigs.app_url}${
    locale === defaultLocale ? '' : `/${locale}`
  }${pathname}`;

  if (locale !== defaultLocale && canonicalUrl.endsWith('/')) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }

  return canonicalUrl;
}

export function getAlternateLanguageUrls(canonicalUrl: string) {
  if (locales.length <= 1) {
    return undefined;
  }

  if (canonicalUrl.startsWith('http')) {
    const parsed = new URL(canonicalUrl);
    if (parsed.origin !== envConfigs.app_url) {
      return undefined;
    }
  }

  const pathname = normalizeCanonicalPath(canonicalUrl);
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, getLocalizedUrl(pathname, locale)])
  ) as Record<string, string>;

  languages['x-default'] = getLocalizedUrl(pathname, defaultLocale);

  return languages;
}

export function getCanonicalUrl(canonicalUrl: string, locale: string) {
  if (!canonicalUrl) {
    canonicalUrl = '/';
  }

  if (canonicalUrl.startsWith('http')) {
    // full url
    canonicalUrl = canonicalUrl;
  } else {
    canonicalUrl = getLocalizedUrl(normalizeCanonicalPath(canonicalUrl), locale);
  }

  return canonicalUrl;
}
