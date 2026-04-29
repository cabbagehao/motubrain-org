#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DEFAULT_AITDK_STOPWORDS_URL =
  'https://extension.aitdk.com/stop-words.json?v=1';
const LOCAL_AITDK_STOPWORDS_FILE = new URL(
  './aitdk-stopwords.json',
  import.meta.url
);

export function countAitdkTotalWords(text) {
  return text.split(/\s+/).length;
}

export function normalizeAitdkTokens(text, stopWords, phraseSize) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((token) => {
      const isNumericToken = !Number.isNaN(Number(token));
      const isStopWord = phraseSize === 1 && stopWords.includes(token);
      return !(isNumericToken || isStopWord);
    });
}

export function computeAitdkKeywordDensity({
  text,
  stopWords,
  phraseSize = 1,
  minOccurrences = 1,
}) {
  const tokens = normalizeAitdkTokens(text, stopWords, phraseSize);
  const phraseCounts = {};

  for (let index = 0; index < tokens.length - phraseSize + 1; index += 1) {
    const phrase = tokens.slice(index, index + phraseSize).join(' ');
    phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
  }

  const repeatedQualifiedPhrases = [];
  for (const phrase of Object.keys(phraseCounts)) {
    if (phraseCounts[phrase] < minOccurrences) {
      continue;
    }

    for (let count = 0; count < phraseCounts[phrase]; count += 1) {
      repeatedQualifiedPhrases.push(phrase);
    }
  }

  const qualifiedCounts = {};
  for (const phrase of repeatedQualifiedPhrases) {
    qualifiedCounts[phrase] = (qualifiedCounts[phrase] || 0) + 1;
  }

  const totalWords = countAitdkTotalWords(text);

  return Object.keys(qualifiedCounts)
    .map((word) => ({
      word,
      count: qualifiedCounts[word],
      density: qualifiedCounts[word] / totalWords,
    }))
    .sort((left, right) => right.density - left.density);
}

export function analyzeSpecificKeywordDensity(text, keyword) {
  const totalWords = countAitdkTotalWords(text);
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedKeyword = keyword
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const keywordWordCount = normalizedKeyword
    ? normalizedKeyword.split(/\s+/).length
    : 0;
  const keywordOccurrences = normalizedKeyword
    ? normalizedText.split(normalizedKeyword).length - 1
    : 0;

  return {
    keyword: normalizedKeyword,
    totalWords,
    keywordOccurrences,
    densityPercent:
      totalWords === 0
        ? 0
        : Number(
            (((keywordOccurrences * keywordWordCount) / totalWords) * 100).toFixed(
              2
            )
          ),
  };
}

export async function fetchAitdkStopWords(
  url = undefined
) {
  if (!url) {
    const groups = JSON.parse(readFileSync(LOCAL_AITDK_STOPWORDS_FILE, 'utf8'));
    return Object.values(groups).flat();
  }

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; On-Page SEO Copy keyword density)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AITDK stopwords: ${response.status}`);
    }

    const groups = await response.json();
    return Object.values(groups).flat();
  } catch {
    const groups = JSON.parse(readFileSync(LOCAL_AITDK_STOPWORDS_FILE, 'utf8'));
    return Object.values(groups).flat();
  }
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function isDirectExecution() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const filePath = process.argv[2];
  const phraseSize = Number(getArgValue('--phrase-size') || '1');
  const top = Number(getArgValue('--top') || '20');
  const minOccurrences = Number(getArgValue('--min-occurrences') || '1');
  const keyword = getArgValue('--keyword');
  const stopWordsUrl = getArgValue('--stopwords-url');

  if (!filePath) {
    console.error(
      'Usage: node aitdk-keyword-density.mjs path/to/file.txt [--top 20] [--phrase-size 1] [--min-occurrences 1] [--keyword "primary keyword"]'
    );
    process.exit(1);
  }

  const text = readFileSync(filePath, 'utf8');

  fetchAitdkStopWords(stopWordsUrl)
    .then((stopWords) => {
      const totalWords = countAitdkTotalWords(text);
      const topKeywords = computeAitdkKeywordDensity({
        text,
        stopWords,
        phraseSize,
        minOccurrences,
      }).slice(0, top);

      const result = {
        totalWords,
        phraseSize,
        topKeywords: topKeywords.map((row) => ({
          keyword: row.word,
          count: row.count,
          totalWords,
          densityPercent: Number((row.density * 100).toFixed(2)),
        })),
        specificKeyword: keyword
          ? analyzeSpecificKeywordDensity(text, keyword)
          : null,
      };

      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
