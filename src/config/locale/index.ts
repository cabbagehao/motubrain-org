import { envConfigs } from '..';

export const localeNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
};

export const locales = ['en', 'zh'];

export const defaultLocale = locales.includes(envConfigs.locale)
  ? envConfigs.locale
  : 'en';

export const localePrefix = 'as-needed';

export const localeDetection = false;

export const englishOnlyPageSlugs = [
  'access-status',
  'benchmarks',
  'privacy-policy',
  'terms-of-service',
  'world-action-model',
  'opencore-legacy-patcher-compatibility',
  'macos-sequoia-unsupported-mac',
  'macos-sonoma-unsupported-mac',
  'macbookpro11-1-opencore-legacy-patcher',
  'imac14-2-opencore-legacy-patcher',
  'opencore-legacy-patcher-error',
  'opencore-legacy-patcher-wifi-bluetooth',
  'opencore-legacy-patcher-non-metal-gpu',
  'mrpack-to-zip',
  'mcp-config-generator',
  'odysseus-ai',
  'pdf-to-markdown',
] as const;

export function isEnglishOnlyPageSlug(slugPath: string) {
  const [firstSegment] = slugPath.replace(/^\/+/, '').split('/');
  return englishOnlyPageSlugs.includes(
    firstSegment as (typeof englishOnlyPageSlugs)[number]
  );
}

export function getEnglishOnlyRedirectPathname(
  pathname: string,
  locale: string
) {
  if (!pathname || locale === defaultLocale) {
    return '';
  }

  const localePrefix = `/${locale}`;
  if (!pathname.startsWith(`${localePrefix}/`)) {
    return '';
  }

  const normalizedPath = pathname.slice(localePrefix.length) || '/';
  return isEnglishOnlyPageSlug(normalizedPath) ? normalizedPath : '';
}

export const localeMessagesRootPath = '@/config/locale/messages';

export const localeMessagesPaths = [
  'common',
  'landing',
  'pages/opencore-legacy-patcher-compatibility',
  'pages/macos-sequoia-unsupported-mac',
  'pages/macos-sonoma-unsupported-mac',
  'pages/macbookpro11-1-opencore-legacy-patcher',
  'pages/imac14-2-opencore-legacy-patcher',
  'pages/opencore-legacy-patcher-error',
  'pages/opencore-legacy-patcher-wifi-bluetooth',
  'pages/opencore-legacy-patcher-non-metal-gpu',
  'pages/mrpack-to-zip',
  'pages/mcp-config-generator',
  'pages/odysseus-ai',
  'pages/pdf-to-markdown',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'settings/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/categories',
  'admin/posts',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/apikeys',
  'admin/ai-tasks',
  'admin/chats',
  'activity/sidebar',
  'activity/ai-tasks',
  'activity/chats',
  'admin/prompts',
  'admin/showcases',
];
