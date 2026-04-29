/**
 * SEO CHECK RUNNER
 * 1. Purpose: run the local public crawler, then run the local AITDK density script.
 * 2. Scope: rendered public pages only.
 * 3. Inputs: repeatable --url / --keyword flags or SEO_CHECK_URLS / SEO_CHECK_KEYWORDS env vars.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');
const { URL } = require('url');

loadDotenv();

const START_URL =
  process.env.SEO_CHECK_START_URL ||
  process.env.CHECK_LINKS_START_URL ||
  'http://localhost:3000';
const TIMEOUT = Number(process.env.SEO_CHECK_TIMEOUT || 10000);

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

function parseArgs(argv) {
  const result = {
    urls: [],
    keywords: [],
    top: Number(process.env.SEO_CHECK_TOP || 10),
    phraseSize: Number(process.env.SEO_CHECK_PHRASE_SIZE || 1),
    skipCrawl: process.env.SEO_CHECK_SKIP_CRAWL === '1',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--url' && argv[index + 1]) {
      result.urls.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === '--keyword' && argv[index + 1]) {
      result.keywords.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === '--top' && argv[index + 1]) {
      result.top = Number(argv[index + 1]) || result.top;
      index += 1;
      continue;
    }

    if (value === '--phrase-size' && argv[index + 1]) {
      result.phraseSize = Number(argv[index + 1]) || result.phraseSize;
      index += 1;
      continue;
    }

    if (value === '--skip-crawl') {
      result.skipCrawl = true;
    }
  }

  if (result.urls.length === 0) {
    result.urls = parseCsv(process.env.SEO_CHECK_URLS);
  }

  if (result.keywords.length === 0) {
    result.keywords = parseCsv(process.env.SEO_CHECK_KEYWORDS);
  }

  if (result.urls.length === 0) {
    result.urls = defaultPublicUrls();
  }

  return result;
}

function defaultPublicUrls() {
  const defaultLocale =
    process.env.CHECK_LINKS_DEFAULT_LOCALE ||
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE ||
    'en';
  const locales = parseCsv(process.env.CHECK_LINKS_LOCALES);
  const activeLocales =
    locales.length > 0 ? Array.from(new Set(locales)) : [defaultLocale];
  const publicPaths = ['/', '/create', '/pricing', '/showcases'];
  const urls = [];

  for (const locale of activeLocales) {
    for (const pagePath of publicPaths) {
      if (locale === defaultLocale) {
        urls.push(pagePath);
      } else if (pagePath === '/') {
        urls.push(`/${locale}`);
      } else {
        urls.push(`/${locale}${pagePath}`);
      }
    }
  }

  return Array.from(new Set(urls));
}

function normalizeUrl(urlString) {
  try {
    return new URL(urlString, START_URL).toString();
  } catch {
    return null;
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
            'User-Agent': 'SEO-Check/1.0',
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
              success: res.statusCode >= 200 && res.statusCode < 400,
              status: res.statusCode,
              html: data,
            })
          );
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, status: 'TIMEOUT', html: '' });
      });

      req.on('error', (error) => {
        resolve({ success: false, status: error.message, html: '' });
      });
    } catch (error) {
      resolve({ success: false, status: error.message, html: '' });
    }
  });
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function findTagContent(html, tagName, attrName, attrValue, contentName) {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*${attrName}=["']${attrValue}["'][^>]*${contentName}=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const match = String(html || '').match(regex);
  return match ? decodeHtml(match[1].trim()) : '';
}

function findTagInnerText(html, tagName) {
  const matches = String(html || '').matchAll(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  );
  return Array.from(matches)
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
}

function buildTextSnapshot(html) {
  const titleMatch = String(html || '').match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : '';
  const description =
    findTagContent(html, 'meta', 'name', 'description', 'content') || '';
  const h1s = findTagInnerText(html, 'h1');
  const body = stripHtml(html);

  return [
    title ? `Title: ${title}` : '',
    description ? `Description: ${description}` : '',
    h1s.length > 0 ? `H1: ${h1s.join(' | ')}` : '',
    body ? `Body: ${body}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function resolveDensityScriptPath() {
  return path.join(__dirname, 'aitdk-keyword-density.mjs');
}

function runCrawl() {
  const crawlScript = path.join(__dirname, 'check-links.js');
  const result = spawnSync(process.execPath, [crawlScript], {
    stdio: 'inherit',
    env: process.env,
  });

  return result.status || 0;
}

function runDensity(densityScriptPath, filePath, top, phraseSize) {
  const result = spawnSync(
    process.execPath,
    [
      densityScriptPath,
      filePath,
      '--top',
      String(top),
      '--phrase-size',
      String(phraseSize),
    ],
    {
      encoding: 'utf8',
      env: process.env,
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Density script failed');
  }

  return JSON.parse(result.stdout);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('Starting combined SEO check...');
  console.log(`Start URL: ${START_URL}`);
  console.log(`URLs: ${options.urls.join(', ')}`);
  console.log(
    `Keywords: ${options.keywords.length > 0 ? options.keywords.join(', ') : '(none; raw top keywords only)'}`
  );
  console.log(`Density phrase size: ${options.phraseSize}`);

  if (!options.skipCrawl) {
    const crawlCode = runCrawl();
    if (crawlCode !== 0) {
      process.exit(crawlCode);
    }
  }

  const densityScriptPath = resolveDensityScriptPath();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-check-'));

  console.log('\n' + '='.repeat(60));
  console.log('KEYWORD DENSITY');
  console.log('='.repeat(60));

  try {
    for (const pageUrl of options.urls) {
      const absoluteUrl = normalizeUrl(pageUrl);
      if (!absoluteUrl) {
        console.log(`\n[SKIP] Invalid URL: ${pageUrl}`);
        continue;
      }

      const response = await fetchUrl(absoluteUrl);
      console.log(`\nPage: ${absoluteUrl}`);
      if (!response.success) {
        console.log(`  Status: ${response.status}`);
        continue;
      }

      const snapshot = buildTextSnapshot(response.html);
      const snapshotPath = path.join(
        tempDir,
        Buffer.from(absoluteUrl).toString('base64url') + '.txt'
      );
      fs.writeFileSync(snapshotPath, snapshot);

      const density = runDensity(
        densityScriptPath,
        snapshotPath,
        options.top,
        options.phraseSize
      );

      console.log(`  Total words: ${density.totalWords}`);
      console.log(`  Phrase size: ${density.phraseSize}`);
      console.log('  Keyword\tCount\tTotal\tDensity');

      for (const row of density.topKeywords || []) {
        console.log(
          `  ${row.keyword}\t${row.count}\t${row.totalWords}\t${row.densityPercent}%`
        );
      }

      if (options.keywords.length > 0) {
        console.log(
          `  Requested keywords: ${options.keywords.join(', ')} (not recalculated by seo-check)`
        );
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('Combined SEO check failed:', error);
  process.exit(1);
});
