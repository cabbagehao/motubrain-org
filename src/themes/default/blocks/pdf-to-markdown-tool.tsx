'use client';

import { useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Copy, Download, FileText } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { trackDocumentToolEvent } from '@/shared/lib/ga4';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

const SAMPLE_TEXT = `Model Context Protocol overview

Many PDF papers and docs export text with awkward line breaks. This browser tool prepares copied PDF text for an LLM or Markdown note.

Key uses
- Preserve headings
- Collapse broken paragraphs
- Keep bullet lists readable
- Add a short source note before sending the text to a model`;

const MIN_PROOF_INPUT_CHARS = 40;

function isProofEligibleInput(input: string) {
  const normalized = input.trim();
  return (
    normalized !== SAMPLE_TEXT && normalized.length >= MIN_PROOF_INPUT_CHARS
  );
}

export function PdfToMarkdownTool({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const hasTrackedUserLoadedText = useRef(false);
  const markdown = useMemo(
    () => convertPdfTextToMarkdown(inputText),
    [inputText]
  );
  const stats = useMemo(
    () => ({
      inputChars: inputText.length,
      outputChars: markdown.length,
      words: markdown.trim() ? markdown.trim().split(/\s+/).length : 0,
    }),
    [inputText, markdown]
  );

  function loadExample() {
    setInputText(SAMPLE_TEXT);
    trackDocumentToolEvent({
      action: 'load_example',
      inputChars: SAMPLE_TEXT.length,
      outputChars: convertPdfTextToMarkdown(SAMPLE_TEXT).length,
      section: section.id,
      proofEligible: false,
    });
  }

  async function copyMarkdown() {
    if (!markdown) return;
    await navigator.clipboard?.writeText(markdown);
    setCopied(true);
    trackDocumentToolEvent({
      action: 'copy_markdown',
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      section: section.id,
      proofEligible: isProofEligibleInput(inputText),
    });
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadMarkdown() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pdf-text-for-llm.md';
    anchor.click();
    URL.revokeObjectURL(url);
    trackDocumentToolEvent({
      action: 'download_markdown',
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      section: section.id,
      proofEligible: isProofEligibleInput(inputText),
    });
  }

  function convertNow() {
    if (!inputText.trim()) return;
    trackDocumentToolEvent({
      action: 'convert_text',
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      section: section.id,
      proofEligible: isProofEligibleInput(inputText),
    });
  }

  function trackPastedText(pastedText: string) {
    if (!hasTrackedUserLoadedText.current && isProofEligibleInput(pastedText)) {
      hasTrackedUserLoadedText.current = true;
      trackDocumentToolEvent({
        action: 'text_loaded',
        inputChars: pastedText.length,
        outputChars: convertPdfTextToMarkdown(pastedText).length,
        section: section.id,
      });
    }
  }

  return (
    <section
      id={section.id}
      className={cn(
        'border-border bg-muted/25 border-y py-10 md:py-14',
        className
      )}
    >
      <div className="container grid gap-6 px-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:px-6">
        <div>
          <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {section.eyebrow || 'PDF to Markdown utility'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {section.description}
          </p>

          <div className="border-border bg-background mt-5 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 size-4 shrink-0" />
              <div>
                <p className="font-medium">Honest conversion boundary</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {section.source_boundary ||
                    'Paste text copied or exported from a PDF. This page does not parse encrypted, scanned, or image-only PDF files.'}
                </p>
              </div>
            </div>
          </div>

          {section.checklist?.length ? (
            <div className="mt-5 grid gap-2">
              {section.checklist.map((item: string) => (
                <div
                  key={item}
                  className="text-muted-foreground flex items-start gap-2 text-sm leading-6"
                >
                  <ClipboardCheck className="mt-1 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-border bg-background rounded-lg border p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Paste PDF text</span>
            <Button variant="outline" size="sm" onClick={loadExample}>
              <ClipboardCheck aria-hidden="true" />
              Load example
            </Button>
          </div>

          <label className="sr-only" htmlFor="pdf-source-text">
            Text copied or exported from a PDF
          </label>
          <textarea
            id="pdf-source-text"
            value={inputText}
            spellCheck={false}
            onBlur={convertNow}
            onChange={(event) => setInputText(event.target.value)}
            onPaste={(event) =>
              trackPastedText(event.clipboardData.getData('text'))
            }
            className="border-input bg-muted/20 focus-visible:ring-ring min-h-56 w-full resize-y rounded-md border p-3 font-mono text-sm leading-6 outline-none focus-visible:ring-2"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {stats.words} words · {stats.outputChars} Markdown characters
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyMarkdown}
                disabled={!markdown}
              >
                <Copy aria-hidden="true" />
                {copied ? 'Copied' : 'Copy Markdown'}
              </Button>
              <Button size="sm" onClick={downloadMarkdown} disabled={!markdown}>
                <Download aria-hidden="true" />
                Download .md
              </Button>
            </div>
          </div>

          <div className="border-border bg-muted/20 mt-4 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Markdown preview</p>
            <pre className="text-muted-foreground max-h-72 overflow-auto text-sm leading-6 whitespace-pre-wrap">
              {markdown || 'Paste text to generate Markdown.'}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function convertPdfTextToMarkdown(input: string) {
  const normalized = input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) {
    return '';
  }

  const lines = normalized.split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    output.push(paragraph.join(' ').replace(/\s+/g, ' ').trim());
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      output.push('');
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      flushParagraph();
      output.push(line.replace(/^[-*•]\s+/, '- '));
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      output.push(line.replace(/^(\d+)[.)]\s+/, '$1. '));
      continue;
    }

    if (looksLikeHeading(line)) {
      flushParagraph();
      output.push(`## ${line.replace(/:$/, '')}`);
      continue;
    }

    paragraph.push(line.replace(/-\s+$/, ''));
  }

  flushParagraph();

  return output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^## /, '# ')
    .trim();
}

function looksLikeHeading(line: string) {
  if (line.length > 80 || /[.!?]$/.test(line)) {
    return false;
  }

  const words = line.split(/\s+/);
  if (words.length <= 6 && /^[A-Z0-9][A-Za-z0-9/:() -]+$/.test(line)) {
    return true;
  }

  return line.endsWith(':') && words.length <= 8;
}
