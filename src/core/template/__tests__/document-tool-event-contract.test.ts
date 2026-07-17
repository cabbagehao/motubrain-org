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
  assert.match(toolSource, /proofEligible: isProofEligibleInput\(inputText\)/);
  assert.match(toolSource, /useState\(''\)/);
});

test('strong proof requires a meaningful pasted document excerpt', () => {
  assert.match(toolSource, /MIN_PROOF_INPUT_CHARS = 40/);
  assert.match(toolSource, /normalized\.length >= MIN_PROOF_INPUT_CHARS/);
  assert.match(toolSource, /onPaste=/);
  assert.match(toolSource, /event\.clipboardData\.getData\('text'\)/);
  assert.doesNotMatch(toolSource, /onChange=\{\(event\) => updateInputText/);
});

test('copy proof is emitted only after a successful clipboard write', () => {
  assert.match(toolSource, /if \(!navigator\.clipboard\?\.writeText\) return/);
  assert.match(
    toolSource,
    /await navigator\.clipboard\.writeText\(markdown\)[\s\S]*trackDocumentToolEvent/
  );
  assert.match(
    toolSource,
    /catch \{[\s\S]*not a successful document-tool outcome/
  );
});
