import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { defaultLocale, isEnglishOnlyPageSlug, locales } from '@/config/locale';
import { getThemePage } from '@/core/theme';
import {
  buildPageMetadata,
  getAlternateLanguageUrls,
  getCanonicalUrl,
} from '@/shared/lib/seo';
import { getLocalPage } from '@/shared/models/post';

const disabledPublicPageSlugs = new Set([
  'blog',
  'create',
  'hairstyles',
  'pricing',
  'showcases',
  'updates',
  'zh',
]);

function getSlugPath(slug: string | string[]) {
  return typeof slug === 'string' ? slug : slug.join('/') || '';
}

function isDisabledPublicPageSlug(slugPath: string) {
  const [firstSegment] = slugPath.split('/');
  return disabledPublicPageSlugs.has(firstSegment);
}

// dynamic page metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  // metadata values
  let title = '';
  let description = '';
  let canonicalUrl = '';

  // 1. try to get static page metadata from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug = getSlugPath(slug);

  if (isDisabledPublicPageSlug(staticPageSlug)) {
    return {};
  }

  if (locale !== defaultLocale && isEnglishOnlyPageSlug(staticPageSlug)) {
    const englishCanonical = getCanonicalUrl(`/${staticPageSlug}`, defaultLocale);
    return {
      alternates: {
        canonical: englishCanonical,
        languages:
          locales.length > 1
            ? {
                [defaultLocale]: englishCanonical,
                'x-default': englishCanonical,
              }
            : undefined,
      },
    };
  }

  // build canonical url
  canonicalUrl = getCanonicalUrl(`/${staticPageSlug}`, locale);
  const alternateLanguages = getAlternateLanguageUrls(`/${staticPageSlug}`);

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page metadata
  if (staticPage) {
    title = staticPage.title || '';
    description = staticPage.description || '';

    return {
      ...buildPageMetadata({
        title,
        description,
        canonicalUrl,
        alternateLanguages,
        locale,
      }),
    };
  }

  // 2. static page not found, try to get dynamic page metadata from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('.') || '';

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page metadata
    if (t.has('metadata')) {
      title = t.raw('metadata.title');
      description = t.raw('metadata.description');

      return {
        ...buildPageMetadata({
          title,
          description,
          canonicalUrl,
          alternateLanguages,
          locale,
        }),
      };
    }
  } catch (error) {
    // Translation not found, continue to common metadata
  }

  // 3. return common metadata
  const tc = await getTranslations('common.metadata');

  title = tc('title');
  description = tc('description');

  return {
    ...buildPageMetadata({
      title,
      description,
      canonicalUrl,
      alternateLanguages,
      locale,
    }),
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // 1. try to get static page from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug = getSlugPath(slug);

  if (isDisabledPublicPageSlug(staticPageSlug)) {
    return notFound();
  }

  if (locale !== defaultLocale && isEnglishOnlyPageSlug(staticPageSlug)) {
    permanentRedirect(`/${staticPageSlug}`);
  }

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page
  if (staticPage) {
    const Page = await getThemePage('static-page');

    return <Page locale={locale} post={staticPage} />;
  }

  // 2. static page not found
  // try to get dynamic page content from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('.') || '';

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page
    if (t.has('page')) {
      const Page = await getThemePage('dynamic-page');
      return <Page locale={locale} page={t.raw('page')} />;
    }
  } catch (error) {
    // Translation not found, continue to 404
  }

  // 3. page not found
  return notFound();
}
