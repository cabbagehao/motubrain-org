import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const analyticsSource = readFileSync('src/shared/lib/ga4.ts', 'utf8');
const toolSource = readFileSync(
  'src/themes/default/blocks/pdf-to-markdown-tool.tsx',
  'utf8'
);

test('document conversion proof events carry active-route attribution', () => {
  assert.match(analyticsSource, /route_id: 'pdf-markdown-conversion'/);
  assert.match(analyticsSource, /strategy_version: '2026-07-15\.1'/);
  assert.match(analyticsSource, /page_location:/);
});

test('example interactions cannot emit strong document conversion proof', () => {
  assert.match(analyticsSource, /'document_tool_demo_action'/);
  assert.match(toolSource, /proofEligible: false/);
  assert.match(toolSource, /proofEligible: inputText !== SAMPLE_TEXT/);
  assert.match(toolSource, /useState\(''\)/);
});
