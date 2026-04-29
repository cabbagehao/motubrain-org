import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('IndexNow workflow listens for successful production deployment status without Vercel API secrets', () => {
  const source = readFileSync('.github/workflows/indexnow.yml', 'utf8');

  assert.match(source, /deployment_status:/);
  assert.match(source, /github\.event\.deployment_status\.state == 'success'/);
  assert.match(source, /github\.event\.deployment\.environment == 'Production'/);
  assert.match(source, /ref: \$\{\{ github\.event\.deployment\.sha \}\}/);
  assert.doesNotMatch(source, /VERCEL_TOKEN/);
  assert.doesNotMatch(source, /VERCEL_PROJECT_ID/);
  assert.doesNotMatch(source, /vercel:wait-production/);
});
