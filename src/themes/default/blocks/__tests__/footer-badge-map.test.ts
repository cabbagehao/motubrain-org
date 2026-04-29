import assert from 'node:assert/strict';
import test from 'node:test';

import { getFooterBadgesForPath } from '../footer-badge-map';

test('getFooterBadgesForPath returns badges only for exact pathname matches', () => {
  const badgeMap = {
    '/': ['<a href="https://example.com">Home</a>'],
    '/pricing': ['<a href="https://example.com/pricing">Pricing</a>'],
  };

  assert.deepEqual(getFooterBadgesForPath('/pricing', badgeMap), [
    '<a href="https://example.com/pricing">Pricing</a>',
  ]);
  assert.equal(getFooterBadgesForPath('/pricing/', badgeMap), undefined);
});

test('getFooterBadgesForPath returns undefined when no pathname is available', () => {
  assert.equal(getFooterBadgesForPath(undefined, {}), undefined);
  assert.equal(getFooterBadgesForPath(null, {}), undefined);
});
