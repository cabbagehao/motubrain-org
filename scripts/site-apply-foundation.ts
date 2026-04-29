import 'dotenv/config';

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { siteProfile, templateSeedProfile } from '../src/config/site-profile';
import {
  syncPackageMetadata,
  syncReadmeContent,
} from './site-foundation/foundation-sync';
import { ensureIndexNowSetup } from './indexnow-config';

const rootDir = process.cwd();
const showLocaleSwitch = true;
const siteUrl = `https://${siteProfile.domain}`;
const appSlug = slugify(siteProfile.appName);
const domainStem = siteProfile.domain.replace(/\.[^.]+$/, '');
const assetPaths = {
  logo: '/logo.png',
  favicon: '/favicon.ico',
  preview: '/preview.png',
};
const supportedLocales = ['en'] as const;
type SupportedLocale = (typeof supportedLocales)[number];

const today = new Date().toISOString().slice(0, 10);

const legalTemplateFiles: Array<{
  locale: SupportedLocale;
  output: string;
  template: string;
}> = [
  {
    locale: 'en',
    output: 'content/pages/privacy-policy.mdx',
    template: 'scripts/site-foundation/templates/privacy-policy.en.mdx',
  },
  {
    locale: 'en',
    output: 'content/pages/terms-of-service.mdx',
    template: 'scripts/site-foundation/templates/terms-of-service.en.mdx',
  },
];

async function readJson<T>(filePath: string): Promise<T> {
  const fullPath = path.join(rootDir, filePath);
  const raw = await readFile(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

async function writeJson(filePath: string, value: unknown) {
  const fullPath = path.join(rootDir, filePath);
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDefaultKeywords() {
  const primaryKeyword = appSlug.replaceAll('-', ' ');
  const variants = [
    primaryKeyword,
    `${primaryKeyword} ai`,
    domainStem,
  ].filter(Boolean);

  return [...new Set(variants)].join(', ');
}

function replaceSeedText(input: string) {
  return input
    .replaceAll(templateSeedProfile.appName, siteProfile.appName)
    .replaceAll(templateSeedProfile.domain, siteProfile.domain)
    .replaceAll(templateSeedProfile.supportEmail, siteProfile.supportEmail)
    .replaceAll(`https://${templateSeedProfile.domain}`, siteUrl)
    .replaceAll('your-app-name', domainStem)
    .replaceAll('/logo.png', assetPaths.logo)
    .replaceAll('/favicon.ico', assetPaths.favicon)
    .replaceAll('/preview.png', assetPaths.preview);
}

function getHeaderNav(locale: SupportedLocale) {
  void locale;
  return [];
}

function getHeroButtons(locale: SupportedLocale) {
  void locale;
  return [];
}

async function updateCommonMessages(locale: SupportedLocale) {
  const filePath = `src/config/locale/messages/${locale}/common.json`;
  const raw = await readFile(path.join(rootDir, filePath), 'utf8');
  const json = JSON.parse(replaceSeedText(raw)) as Record<string, any>;

  json.metadata.title = siteProfile.appName;
  json.metadata.keywords = getDefaultKeywords();

  await writeJson(filePath, json);
}

async function updateLandingMessages(locale: SupportedLocale) {
  const filePath = `src/config/locale/messages/${locale}/landing.json`;
  const json = await readJson<Record<string, any>>(filePath);
  const seeded = JSON.parse(
    replaceSeedText(JSON.stringify(json))
  ) as Record<string, any>;

  seeded.header.brand.title = siteProfile.appName;
  seeded.header.brand.logo.src = assetPaths.logo;
  seeded.header.brand.logo.alt = siteProfile.appName;
  seeded.header.nav.items = getHeaderNav(locale);
  seeded.header.show_locale = showLocaleSwitch;
  seeded.hero.title = siteProfile.appName;
  seeded.hero.buttons = getHeroButtons(locale);
  delete seeded.cta;
  delete seeded.subscribe;

  if (seeded.footer?.nav) {
    seeded.footer.nav.items = [
      {
        title: 'Site',
        children: [
          {
            title: 'Features',
            url: '/#features',
            target: '_self',
          },
          {
            title: 'FAQ',
            url: '/#faq',
            target: '_self',
          },
        ],
      },
    ];
  }

  await writeJson(filePath, seeded);
}

async function updateAdminSidebarMessages(locale: SupportedLocale) {
  const filePath = `src/config/locale/messages/${locale}/admin/sidebar.json`;
  const raw = await readFile(path.join(rootDir, filePath), 'utf8');
  const seeded = JSON.parse(replaceSeedText(raw)) as Record<string, any>;

  seeded.header.brand.title = siteProfile.appName;
  seeded.header.brand.logo.alt = siteProfile.appName;
  seeded.footer.nav.items = [
    {
      title: 'Home',
      url: '/',
      icon: 'Home',
      target: '_blank',
    },
    {
      title: 'Email',
      url: `mailto:${siteProfile.supportEmail}`,
      icon: 'Mail',
      target: '_blank',
    },
  ];

  await writeJson(filePath, seeded);
}

async function updateReadme() {
  const filePath = 'README.md';
  const fullPath = path.join(rootDir, filePath);
  const existing = await readFile(fullPath, 'utf8');
  const pkg = await readJson<Record<string, any>>('package.json');
  const repositoryUrl =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;

  await writeFile(
    fullPath,
    syncReadmeContent(existing, siteProfile, repositoryUrl)
  );
}

async function updatePackageMetadata() {
  const filePath = 'package.json';
  const pkg = await readJson<Record<string, any>>(filePath);

  await writeJson(filePath, syncPackageMetadata(pkg, siteProfile));
}

async function updateSitemap() {
  const filePath = 'public/sitemap.xml';
  const fullPath = path.join(rootDir, filePath);
  const content = `<?xml version='1.0' encoding='utf-8' standalone='yes'?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}T00:00:00+00:00</lastmod>
  </url>
</urlset>
`;

  await writeFile(fullPath, content);
}

function getLegalReplacements() {
  return {
    '{{SITE_NAME}}': siteProfile.appName,
    '{{SITE_DOMAIN}}': siteProfile.domain,
    '{{SITE_URL}}': siteUrl,
    '{{SUPPORT_EMAIL}}': siteProfile.supportEmail,
    '{{UPDATED_AT}}': today,
  };
}

async function renderLegalPages() {
  for (const file of legalTemplateFiles) {
    const templatePath = path.join(rootDir, file.template);
    const outputPath = path.join(rootDir, file.output);
    let content = await readFile(templatePath, 'utf8');

    for (const [token, value] of Object.entries(getLegalReplacements())) {
      content = content.replaceAll(token, value);
    }

    await writeFile(outputPath, content);
  }
}

async function main() {
  await Promise.all([
    updateCommonMessages('en'),
    updateLandingMessages('en'),
    updateAdminSidebarMessages('en'),
    updateReadme(),
    updatePackageMetadata(),
    updateSitemap(),
  ]);

  await renderLegalPages();
  if (siteProfile.domain !== templateSeedProfile.domain) {
    await ensureIndexNowSetup();
  }

  process.stdout.write(
    'Applied site foundation from NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_URL\n'
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
