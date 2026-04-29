export type SiteIdentity = {
  appName: string;
  domain: string;
  supportEmail: string;
};

type PackageMetadata = Record<string, any>;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function rewriteRepositoryUrl(url: string, slug: string) {
  if (!url) {
    return url;
  }

  return url.replace(/([^/]+?)(?:\.git)?$/, `${slug}`);
}

function rewriteIssuesUrl(url: string, slug: string) {
  return url.replace(/\/([^/]+?)\/issues\b/, `/${slug}/issues`);
}

function inferIssuesUrl(readme: string, repositoryUrl: string | undefined, slug: string) {
  const issuesMatch = readme.match(/https:\/\/github\.com\/[^)\s]+\/issues/);
  if (issuesMatch?.[0]) {
    return rewriteIssuesUrl(issuesMatch[0], slug);
  }

  if (repositoryUrl?.includes('github.com/')) {
    return `${rewriteRepositoryUrl(repositoryUrl, slug)}/issues`;
  }

  return '';
}

export function syncPackageMetadata(
  pkg: PackageMetadata,
  siteIdentity: SiteIdentity
) {
  const slug = slugify(siteIdentity.appName);
  const next = { ...pkg };
  const homepage = `https://${siteIdentity.domain}`;

  next.name = slug;
  next.author = siteIdentity.appName;
  next.homepage = homepage;

  if (typeof next.repository === 'string') {
    next.repository = rewriteRepositoryUrl(next.repository, slug);
  } else if (next.repository?.url) {
    next.repository = {
      ...next.repository,
      url: rewriteRepositoryUrl(next.repository.url, slug),
    };
  }

  next.keywords = dedupe([
    siteIdentity.appName.toLowerCase(),
    slug,
    siteIdentity.domain,
    `${slug} website`,
    `${slug} app`,
  ]);

  return next;
}

export function syncReadmeContent(
  _existingReadme: string,
  siteIdentity: SiteIdentity,
  repositoryUrl?: string
) {
  const slug = slugify(siteIdentity.appName);
  const siteUrl = `https://${siteIdentity.domain}`;
  const issuesUrl = inferIssuesUrl(_existingReadme, repositoryUrl, slug);

  const lines = [
    `# ${siteIdentity.appName}`,
    '',
    '## Website',
    '',
    `Visit [${siteIdentity.domain}](${siteUrl}) to preview the current site.`,
    '',
    '## Support',
    '',
    'Use the project support email for project-specific support.',
  ];

  if (issuesUrl) {
    lines.push(
      '',
      '## Issues',
      '',
      `Track template or project issues at [GitHub Issues](${issuesUrl}).`
    );
  }

  lines.push(
    '',
    '## License',
    '',
    '[Project License](./LICENSE)'
  );

  return `${lines.join('\n')}\n`;
}
