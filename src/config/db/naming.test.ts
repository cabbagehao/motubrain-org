import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dbPrefix,
  indexName,
  normalizeDbPrefix,
  tableName,
  withDbPrefix,
} from './naming';

test('normalizeDbPrefix normalizes spaces, casing, and punctuation', () => {
  assert.equal(normalizeDbPrefix('Nano Banana Pro'), 'nano_banana_pro_');
  assert.equal(
    normalizeDbPrefix('  Nano-Banana Pro!!  '),
    'nano_banana_pro_'
  );
});

test('normalizeDbPrefix falls back to a stable app prefix', () => {
  assert.equal(normalizeDbPrefix(''), 'app_');
  assert.equal(normalizeDbPrefix('!!!'), 'app_');
  assert.equal(normalizeDbPrefix('123 Studio'), 'app_123_studio_');
});

test('withDbPrefix keeps identifiers within database limits', () => {
  const prefixed = withDbPrefix('x'.repeat(80));

  assert.ok(prefixed.startsWith(dbPrefix));
  assert.ok(prefixed.length <= 63);
});

test('tableName and indexName use the configured project prefix', () => {
  assert.equal(tableName('user'), `${dbPrefix}user`);
  assert.equal(indexName('idx_user_name'), `${dbPrefix}idx_user_name`);
});
