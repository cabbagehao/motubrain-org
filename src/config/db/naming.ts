import { envConfigs } from '@/config';

const MAX_DB_IDENTIFIER_LENGTH = 63;
const FALLBACK_DB_PREFIX = 'app';

function hashString(value: string): string {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function trimIdentifier(value: string, maxLength = MAX_DB_IDENTIFIER_LENGTH) {
  if (value.length <= maxLength) {
    return value;
  }

  const hash = hashString(value);
  const headLength = Math.max(1, maxLength - hash.length - 1);

  return `${value.slice(0, headLength)}_${hash}`;
}

export function normalizeDbPrefix(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  const base = normalized.length > 0 ? normalized : FALLBACK_DB_PREFIX;
  const safeBase = /^[a-z]/.test(base) ? base : `${FALLBACK_DB_PREFIX}_${base}`;

  return `${safeBase}_`;
}

function getConfiguredDbPrefix() {
  return envConfigs.db_table_prefix || envConfigs.app_name;
}

export const dbPrefix = normalizeDbPrefix(getConfiguredDbPrefix());

export function withDbPrefix(
  identifier: string,
  maxLength = MAX_DB_IDENTIFIER_LENGTH
): string {
  return trimIdentifier(`${dbPrefix}${identifier}`, maxLength);
}

export function tableName(identifier: string): string {
  return withDbPrefix(identifier);
}

export function indexName(identifier: string): string {
  return withDbPrefix(identifier);
}
