export type SiteProfile = {
  appName: string;
  domain: string;
  supportEmail: string;
};

export const templateSeedProfile: SiteProfile = {
  appName: 'Motubrain.org',
  domain: 'motubrain.org',
  supportEmail: 'support@motubrain.org',
};

function normalizeDomain(urlOrDomain: string) {
  return urlOrDomain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

const resolvedDomain = normalizeDomain(
  process.env.NEXT_PUBLIC_APP_URL ?? templateSeedProfile.domain
);

export const siteProfile: SiteProfile = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? templateSeedProfile.appName,
  domain: resolvedDomain,
  supportEmail: templateSeedProfile.supportEmail,
};
