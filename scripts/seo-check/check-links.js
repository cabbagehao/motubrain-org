/**
 * PUBLIC SEO CRAWLER
 * 1. Purpose: simulate a search engine bot across the public site.
 * 2. Scope: start from sitemap.xml and '/', then follow internal HTML <a> links.
 * 3. Checks: link health, canonical alignment, robots policy, X-Robots-Tag, and html lang.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

loadDotenv();

const START_URL = process.env.CHECK_LINKS_START_URL || 'http://localhost:3000';
const PRODUCTION_DOMAIN = resolveProductionDomain();
const TIMEOUT = Number(process.env.CHECK_LINKS_TIMEOUT || 10000);
const MAX_CONCURRENT = Number(process.env.CHECK_LINKS_MAX_CONCURRENT || 2);
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = Number(process.env.CHECK_LINKS_MAX_RETRIES || 2);
const BOT_PROFILE = (process.env.CHECK_LINKS_BOT || 'googlebot').toLowerCase();
const USER_AGENT = resolveUserAgent();
const REPORT_PATH = process.env.CHECK_LINKS_REPORT_PATH || '';
const DEFAULT_LOCALE =
  process.env.CHECK_LINKS_DEFAULT_LOCALE ||
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE ||
  'en';
const LOCALES = parseCsv(process.env.CHECK_LINKS_LOCALES);
const EFFECTIVE_LOCALES =
  LOCALES.length > 0 ? Array.from(new Set(LOCALES)) : [DEFAULT_LOCALE];
const NOINDEX_PATHS = (() => {
  const configured = parseCsv(process.env.CHECK_LINKS_NOINDEX_PATHS);
  if (configured.length > 0) {
    return configured;
  }

  return [
    '/sign-in',
    '/sign-up',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/account',
    '/settings',
    '/billing',
    '/checkout',
    '/cart',
    '/dashboard',
    '/admin',
  ];
})();

const START_ORIGIN = new URL(START_URL).origin;
const PRODUCTION_ORIGIN = new URL(PRODUCTION_DOMAIN).origin;

const WHITELIST_PREFIXES = [
  `${START_ORIGIN}/_next/`,
  `${START_ORIGIN}/favicon.ico`,
];

const visitedUrls = new Map();
const queue = [];
const baseUrl = new URL(START_URL);

function loadDotenv() {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.development' });
    dotenv.config({ path: '.env', override: false });
  } catch {
    // Ignore when dotenv is unavailable.
  }
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveProductionDomain() {
  const candidate = process.env.NEXT_PUBLIC_APP_URL;

  if (!candidate) {
    throw new Error(
      'Missing production domain. Set NEXT_PUBLIC_APP_URL before running the crawler.'
    );
  }

  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
}

function resolveUserAgent() {
  if (process.env.CHECK_LINKS_USER_AGENT) {
    return process.env.CHECK_LINKS_USER_AGENT;
  }

  if (BOT_PROFILE === 'bingbot') {
    return 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
  }

  return 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
}

function parseSitemapUrls(content) {
  return [...String(content || '').matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => match[1]
  );
}

async function getRuntimeSitemapUrls() {
  const sitemapUrl = `${START_ORIGIN}/sitemap.xml`;
  const response = await fetchUrlWithRetry(sitemapUrl);
  if (!response.success) {
    return [];
  }

  return parseSitemapUrls(response.html).map((url) =>
    url.replace(PRODUCTION_ORIGIN, START_ORIGIN)
  );
}

async function getSitemapUrls() {
  return getRuntimeSitemapUrls();
}

function normalizeUrl(urlString, base) {
  try {
    const url = new URL(urlString, base);
    url.hash = '';

    let fullUrl = `${url.origin}${url.pathname}${url.search}`;
    if (fullUrl.endsWith('/') && fullUrl.length > url.origin.length + 1) {
      fullUrl = fullUrl.slice(0, -1);
    } else if (fullUrl === `${url.origin}/`) {
      fullUrl = url.origin;
    }

    return fullUrl;
  } catch {
    return null;
  }
}

function isInternalUrl(urlString) {
  try {
    return new URL(urlString).hostname === baseUrl.hostname;
  } catch {
    return false;
  }
}

function fetchUrl(urlString) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(
        urlString,
        {
          timeout: TIMEOUT,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              html: data,
              headers: res.headers,
              success: res.statusCode >= 200 && res.statusCode < 400,
            })
          );
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'TIMEOUT', success: false });
      });

      req.on('error', (err) => {
        resolve({ error: err.message, success: false });
      });
    } catch (err) {
      resolve({ error: err.message, success: false });
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUrlWithRetry(urlString) {
  let attempt = 0;
  let lastResponse = null;

  while (attempt <= MAX_RETRIES) {
    lastResponse = await fetchUrl(urlString);
    const status = lastResponse.status;
    const shouldRetry =
      !lastResponse.success &&
      (lastResponse.error || RETRYABLE_STATUS_CODES.has(status));

    if (!shouldRetry || attempt === MAX_RETRIES) {
      return lastResponse;
    }

    attempt += 1;
    await sleep(250 * attempt);
  }

  return lastResponse;
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function findHeaderValue(headers, headerName) {
  const target = headerName.toLowerCase();
  const entry = Object.entries(headers || {}).find(
    ([key]) => key.toLowerCase() === target
  );
  if (!entry) {
    return null;
  }

  const [, value] = entry;
  return Array.isArray(value) ? value.join(', ') : value;
}

function findTagContent(html, tagName, attrName, attrValue, contentName) {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*${attrName}=["']${attrValue}["'][^>]*${contentName}=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const match = html.match(regex);
  return match ? decodeHtml(match[1].trim()) : null;
}

function findHtmlLang(html) {
  const match = html.match(/<html\b[^>]*\blang=["']([^"']+)["'][^>]*>/i);
  return match ? match[1].trim() : null;
}

function findTagInnerText(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map((match) =>
      decodeHtml(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    )
    .filter(Boolean);
}

function extractLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(
    (match) => decodeHtml(match[1].trim())
  );
}

function extractBodyText(html) {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function countWords(text) {
  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeCanonicalForCompare(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    url.hash = '';

    let normalized = `${url.origin}${url.pathname}${url.search}`;
    if (normalized.endsWith('/') && normalized.length > url.origin.length + 1) {
      normalized = normalized.slice(0, -1);
    } else if (normalized === `${url.origin}/`) {
      normalized = url.origin;
    }

    return normalized.replace(START_ORIGIN, PRODUCTION_ORIGIN);
  } catch {
    return urlString.endsWith('/') ? urlString.slice(0, -1) : urlString;
  }
}

function getLocaleAwarePathname(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { locale: DEFAULT_LOCALE, pathname: '/' };
  }

  const [firstSegment] = segments;
  if (EFFECTIVE_LOCALES.includes(firstSegment)) {
    const strippedPath = `/${segments.slice(1).join('/')}`.replace(/\/$/, '');
    return {
      locale: firstSegment,
      pathname: strippedPath === '' ? '/' : strippedPath,
    };
  }

  return { locale: DEFAULT_LOCALE, pathname };
}

function getExpectedRobots(pathname) {
  const { pathname: localeAwarePathname } = getLocaleAwarePathname(pathname);
  return NOINDEX_PATHS.some(
    (path) =>
      localeAwarePathname === path || localeAwarePathname.startsWith(`${path}/`)
  )
    ? 'noindex, nofollow'
    : 'index, follow';
}

function robotsMatches(actual, expected) {
  const normalizedActual = (actual || '')
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedExpected = expected
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return normalizedExpected.every((token) => normalizedActual.includes(token));
}

function auditSEO(html, currentUrl, headers = {}) {
  const urlObj = new URL(currentUrl);
  const pathname = urlObj.pathname;

  const actualCanonical = findTagContent(html, 'link', 'rel', 'canonical', 'href');
  const actualRobots =
    findTagContent(html, 'meta', 'name', 'robots', 'content') || 'index, follow';
  const actualXRobots = findHeaderValue(headers, 'x-robots-tag');
  const actualLang = findHtmlLang(html);
  const title = decodeHtml((html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim());
  const description =
    findTagContent(html, 'meta', 'name', 'description', 'content') || '';
  const h1s = findTagInnerText(html, 'h1');
  const bodyText = extractBodyText(html);
  const { locale: expectedLang } = getLocaleAwarePathname(pathname);

  let expectedCanonical = `${PRODUCTION_ORIGIN}${pathname === '/' ? '' : pathname}`;
  if (
    expectedCanonical.endsWith('/') &&
    expectedCanonical.length > PRODUCTION_ORIGIN.length
  ) {
    expectedCanonical = expectedCanonical.slice(0, -1);
  }

  const expectedRobots = getExpectedRobots(pathname);

  return {
    canonical: {
      actual: actualCanonical,
      expected: expectedCanonical,
      ok:
        normalizeCanonicalForCompare(actualCanonical) ===
        normalizeCanonicalForCompare(expectedCanonical),
    },
    robots: {
      actual: actualRobots,
      expected: expectedRobots,
      ok: robotsMatches(actualRobots, expectedRobots),
    },
    xRobots: {
      actual: actualXRobots,
      expected: expectedRobots,
      ok: robotsMatches(actualXRobots || actualRobots, expectedRobots),
    },
    lang: {
      actual: actualLang,
      expected: expectedLang,
      ok: actualLang === expectedLang,
    },
    snapshot: {
      title,
      description,
      h1s,
      wordCount: countWords(bodyText),
      textExcerpt: bodyText.slice(0, 240),
    },
    links: extractLinks(html),
  };
}

async function processUrl(urlString, sourcePage = null) {
  const normalized = normalizeUrl(urlString, START_URL);
  if (
    !normalized ||
    visitedUrls.has(normalized) ||
    WHITELIST_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return;
  }

  visitedUrls.set(normalized, { status: 'pending' });
  const response = await fetchUrlWithRetry(normalized);
  const result = {
    url: normalized,
    status: response.status || response.error,
    success: response.success,
    source: sourcePage,
  };

  if (
    response.success &&
    isInternalUrl(normalized) &&
    response.headers['content-type']?.includes('text/html')
  ) {
    const seoData = auditSEO(response.html, normalized, response.headers);
    result.seo = seoData;

    for (const link of seoData.links) {
      const nextUrl = normalizeUrl(link, normalized);
      if (nextUrl && isInternalUrl(nextUrl) && !visitedUrls.has(nextUrl)) {
        queue.push({ url: nextUrl, source: normalized });
      }
    }
  }

  visitedUrls.set(normalized, result);
}

async function main() {
  console.log('Starting public SEO audit crawler...');
  console.log(`Start URL: ${START_URL}`);
  console.log(`Production Domain: ${PRODUCTION_DOMAIN}`);
  console.log(`Bot Profile: ${BOT_PROFILE}`);
  console.log(`User Agent: ${USER_AGENT}`);
  console.log(`Default Locale: ${DEFAULT_LOCALE}`);
  console.log(`Locales: ${EFFECTIVE_LOCALES.join(', ')}`);
  console.log(`Noindex Paths: ${NOINDEX_PATHS.join(', ')}`);

  const sitemapUrls = await getSitemapUrls();
  console.log(`Sitemap Seeds: ${sitemapUrls.length}`);
  const seeds = Array.from(new Set([START_URL, ...sitemapUrls]));
  console.log(`Initial Seeds: ${seeds.length} URLs`);
  seeds.forEach((url) => queue.push({ url, source: 'SEED' }));

  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_CONCURRENT);
    await Promise.all(batch.map((item) => processUrl(item.url, item.source)));
  }

  printReport();
}

function printReport() {
  const all = Array.from(visitedUrls.values()).filter(
    (result) => result.status !== 'pending'
  );
  const healthy = all.filter((result) => result.success);
  const dead = all.filter((result) => !result.success);
  const seoIssues = all.filter(
    (result) =>
      result.seo &&
      (!result.seo.canonical.ok ||
        !result.seo.robots.ok ||
        !result.seo.xRobots.ok ||
        !result.seo.lang.ok)
  );

  console.log('\n' + '='.repeat(60));
  console.log('AUDIT REPORT');
  console.log('='.repeat(60));

  console.log(`\nPage Checks (${all.length}):`);
  all.forEach((result) => {
    console.log(`\n  Page: ${result.url}`);
    console.log(`    - [${result.success ? 'PASS' : 'FAIL'}] Response status: ${result.status}`);
    if (result.source) {
      console.log(`      Source: ${result.source}`);
    }

    if (!result.seo) {
      return;
    }

    console.log(
      `    - [${result.seo.canonical.ok ? 'PASS' : 'FAIL'}] Canonical`
    );
    console.log(`      Expected: ${result.seo.canonical.expected}`);
    console.log(`      Actual:   ${result.seo.canonical.actual || '(missing)'}`);

    console.log(`    - [${result.seo.robots.ok ? 'PASS' : 'FAIL'}] Robots meta`);
    console.log(`      Expected: ${result.seo.robots.expected}`);
    console.log(`      Actual:   ${result.seo.robots.actual || '(missing)'}`);

    console.log(
      `    - [${result.seo.xRobots.ok ? 'PASS' : 'FAIL'}] X-Robots-Tag`
    );
    console.log(`      Expected: ${result.seo.xRobots.expected}`);
    console.log(
      `      Actual:   ${result.seo.xRobots.actual || '(missing)'}`
    );

    console.log(`    - [${result.seo.lang.ok ? 'PASS' : 'FAIL'}] html lang`);
    console.log(`      Expected: ${result.seo.lang.expected}`);
    console.log(`      Actual:   ${result.seo.lang.actual || '(missing)'}`);

    console.log(`      Title: ${result.seo.snapshot.title || '(missing)'}`);
    console.log(
      `      Description: ${result.seo.snapshot.description || '(missing)'}`
    );
    console.log(
      `      H1s: ${result.seo.snapshot.h1s.length > 0 ? result.seo.snapshot.h1s.join(' | ') : '(none)'}`
    );
    console.log(`      Word count: ${result.seo.snapshot.wordCount}`);
  });

  if (dead.length > 0) {
    console.log(`\nDead Links (${dead.length}):`);
    dead.forEach((result) => {
      console.log(`  [${result.status}] ${result.url}`);
      console.log(`     Found on: ${result.source || 'SEED'}`);
    });
  }

  if (seoIssues.length > 0) {
    console.log(`\nSEO Policy Issues (${seoIssues.length}):`);
    seoIssues.forEach((result) => {
      console.log(`\n  Page: ${result.url}`);
      if (!result.seo.robots.ok) {
        console.log(
          `    - Robots: Expected "${result.seo.robots.expected}", Got "${result.seo.robots.actual}"`
        );
      }
      if (!result.seo.xRobots.ok) {
        console.log(
          `    - X-Robots-Tag: Expected "${result.seo.xRobots.expected}", Got "${result.seo.xRobots.actual || '(missing)'}"`
        );
      }
      if (!result.seo.canonical.ok) {
        console.log(
          `    - Canonical: Expected "${result.seo.canonical.expected}"`
        );
        console.log(
          `                 Got      "${result.seo.canonical.actual}"`
        );
        if (result.seo.canonical.actual?.includes('localhost')) {
          console.log(
            '      Tip: the app is using a localhost canonical in dev. This is expected locally, but not for production.'
          );
        }
      }
      if (!result.seo.lang.ok) {
        console.log(
          `    - Lang: Expected "${result.seo.lang.expected}", Got "${result.seo.lang.actual}"`
        );
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  if (dead.length === 0 && seoIssues.length === 0) {
    console.log('PERFECT: All public pages passed the SEO audit.');
  } else {
    console.log('DONE: Review the issues listed above.');
  }

  if (REPORT_PATH) {
    const report = {
      generatedAt: new Date().toISOString(),
      startUrl: START_URL,
      productionDomain: PRODUCTION_DOMAIN,
      botProfile: BOT_PROFILE,
      userAgent: USER_AGENT,
      defaultLocale: DEFAULT_LOCALE,
      locales: EFFECTIVE_LOCALES,
      noindexPaths: NOINDEX_PATHS,
      results: all,
    };

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`JSON report written to ${REPORT_PATH}`);
  }

  process.exit(dead.length > 0 ? 1 : 0);
}

main();
