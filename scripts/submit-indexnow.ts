#!/usr/bin/env tsx

import 'dotenv/config';

import { fetchWithNodeProxy } from '../src/shared/lib/node-proxy';
import {
  getIndexNowKey,
  getIndexNowKeyLocation,
  getSiteUrl,
  parseSitemapUrls,
} from './indexnow-config';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const USER_AGENT = 'ShipAny-IndexNow-Bot/1.0';

interface IndexNowSubmission {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

async function fetchSitemapUrls(siteUrl: string): Promise<string[]> {
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const response = await fetchWithNodeProxy(sitemapUrl, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sitemap: ${response.status} ${response.statusText}`
    );
  }

  const xml = await response.text();
  return parseSitemapUrls(xml);
}

async function submitToIndexNow(
  siteUrl: string,
  key: string,
  keyLocation: string,
  urls: string[]
): Promise<void> {
  if (!urls.length) {
    console.log('No URLs found in sitemap, skipping IndexNow submission.');
    return;
  }

  const host = new URL(siteUrl).hostname;
  const batchSize = 50;

  for (let index = 0; index < urls.length; index += batchSize) {
    const urlList = urls.slice(index, index + batchSize);
    const payload: IndexNowSubmission = {
      host,
      key,
      keyLocation,
      urlList,
    };

    const response = await fetchWithNodeProxy(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();

    console.log(
      `IndexNow response: ${response.status} ${response.statusText || 'OK'}`
    );
    if (responseText) {
      console.log(responseText);
    }

    if (!response.ok) {
      throw new Error(
        `IndexNow submission failed: ${response.status} ${response.statusText}`
      );
    }

    console.log(
      `Submitted batch ${Math.floor(index / batchSize) + 1} with ${urlList.length} URLs.`
    );
  }
}

async function main() {
  const siteUrl = getSiteUrl();
  const indexNowKey = getIndexNowKey();
  const keyLocation = getIndexNowKeyLocation(siteUrl, indexNowKey);
  const urls = await fetchSitemapUrls(siteUrl);

  console.log(
    `Submitting ${urls.length} sitemap URLs from ${siteUrl} to IndexNow...`
  );
  await submitToIndexNow(siteUrl, indexNowKey, keyLocation, urls);
  console.log('IndexNow submission completed.');
}

void main().catch((error) => {
  console.error('IndexNow submission failed:', error);
  process.exitCode = 1;
});
