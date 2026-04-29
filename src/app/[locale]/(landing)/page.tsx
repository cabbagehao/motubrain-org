import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { DynamicPage, Section } from '@/shared/types/blocks/landing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');

  const showSections = [
    'hero',
    'stats',
    'introduce',
    'benefits',
    'usage',
    'features',
    'logos',
    'testimonials',
    'faq',
  ];

  // build page sections
  const sections = showSections.reduce<Record<string, Section>>(
    (acc, section) => {
      const sectionData = t.raw(section) as Section;
      if (sectionData && typeof sectionData === 'object') {
        acc[section] = sectionData;
      }
      return acc;
    },
    {}
  );

  const page: DynamicPage = {
    sections,
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  const hero = sections.hero;
  const structuredData = buildLandingPageStructuredData({
    locale,
    title:
      typeof hero?.title === 'string' && hero.title.trim()
        ? hero.title
        : envConfigs.app_name,
    description:
      typeof hero?.description === 'string' && hero.description.trim()
        ? hero.description
        : envConfigs.app_description,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Page locale={locale} page={page} />
    </>
  );
}

function buildLandingPageStructuredData({
  locale,
  title,
  description,
}: {
  locale: string;
  title: string;
  description: string;
}) {
  const siteUrl = envConfigs.app_url.replace(/\/+$/, '');
  const logoUrl = toAbsoluteUrl(envConfigs.app_logo);
  const previewImageUrl = toAbsoluteUrl(envConfigs.app_preview_image);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: envConfigs.app_name,
        url: siteUrl,
        logo: logoUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: envConfigs.app_name,
        url: siteUrl,
        description,
        inLanguage: locale,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: title,
        description,
        applicationCategory: 'ReferenceApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        image: previewImageUrl,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
      },
    ],
  };
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith('http')) {
    return pathOrUrl;
  }

  const siteUrl = envConfigs.app_url.replace(/\/+$/, '');
  const pathname = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;

  return `${siteUrl}${pathname}`;
}
