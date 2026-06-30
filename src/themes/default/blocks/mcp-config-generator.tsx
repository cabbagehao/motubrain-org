'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileJson,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { trackMcpConfigEvent } from '@/shared/lib/ga4';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

type Diagnostic = {
  level: 'error' | 'warning' | 'ok';
  message: string;
};

const SAMPLE_CONFIG = {
  mcpServers: {
    'local-filesystem': {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        '/path/to/project',
      ],
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};

export function McpConfigGenerator({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const sampleConfig = JSON.stringify(SAMPLE_CONFIG, null, 2);
  const [configText, setConfigText] = useState(sampleConfig);
  const [copied, setCopied] = useState(false);
  const diagnostics = useMemo(() => inspectMcpConfig(configText), [configText]);
  const issueCount = diagnostics.filter((item) => item.level !== 'ok').length;
  const hasErrors = diagnostics.some((item) => item.level === 'error');
  const status = hasErrors ? 'invalid' : issueCount > 0 ? 'warning' : 'valid';

  async function copySample() {
    await navigator.clipboard?.writeText(sampleConfig);
    setCopied(true);
    trackMcpConfigEvent({
      action: 'copy_example',
      status: 'valid',
      section: section.id,
    });
    window.setTimeout(() => setCopied(false), 1600);
  }

  function loadSample() {
    setConfigText(sampleConfig);
    trackMcpConfigEvent({
      action: 'load_example',
      status: 'valid',
      section: section.id,
    });
  }

  function trackValidation() {
    trackMcpConfigEvent({
      action: 'validate_json',
      status,
      issueCount,
      section: section.id,
    });
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
            {section.eyebrow || 'MCP config utility'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {section.description}
          </p>

          <div className="border-border bg-background mt-5 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-4 shrink-0" />
              <div>
                <p className="font-medium">Source boundary</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {section.source_boundary ||
                    'This utility checks common JSON shape and security hygiene. Confirm final fields against the client and server documentation you actually run.'}
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
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-border bg-background rounded-lg border p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="size-5" />
              <span className="font-semibold">JSON config scratchpad</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={loadSample}>
                <ClipboardCheck aria-hidden="true" />
                Load example
              </Button>
              <Button variant="outline" size="sm" onClick={copySample}>
                <Copy aria-hidden="true" />
                {copied ? 'Copied' : 'Copy example'}
              </Button>
            </div>
          </div>

          <label className="sr-only" htmlFor="mcp-config-json">
            MCP JSON configuration
          </label>
          <textarea
            id="mcp-config-json"
            value={configText}
            spellCheck={false}
            onChange={(event) => setConfigText(event.target.value)}
            onBlur={trackValidation}
            className="border-input bg-muted/20 focus-visible:ring-ring min-h-72 w-full resize-y rounded-md border p-3 font-mono text-sm leading-6 outline-none focus-visible:ring-2"
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {status === 'valid'
                ? 'No common JSON shape issues found.'
                : `${issueCount} item${issueCount === 1 ? '' : 's'} need attention.`}
            </p>
            <Button size="sm" onClick={trackValidation}>
              Check JSON
            </Button>
          </div>

          <div className="mt-4 grid gap-2" aria-live="polite">
            {diagnostics.map((item) => (
              <div
                key={`${item.level}:${item.message}`}
                className={cn(
                  'flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-6',
                  item.level === 'error'
                    ? 'border-destructive/30 bg-destructive/5'
                    : item.level === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-emerald-600/25 bg-emerald-600/5'
                )}
              >
                {item.level === 'ok' ? (
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-1 size-4 shrink-0" />
                )}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function inspectMcpConfig(configText: string): Diagnostic[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(configText);
  } catch (error) {
    return [
      {
        level: 'error',
        message:
          error instanceof Error
            ? `Invalid JSON: ${error.message}`
            : 'Invalid JSON.',
      },
    ];
  }

  if (!isPlainObject(parsed)) {
    return [
      {
        level: 'error',
        message: 'The top-level config should be a JSON object.',
      },
    ];
  }

  const diagnostics: Diagnostic[] = [];
  const servers = parsed.mcpServers;

  if (!isPlainObject(servers)) {
    diagnostics.push({
      level: 'warning',
      message:
        'Common MCP client configs use a top-level mcpServers object. If your client uses another shape, verify it against that client documentation.',
    });
  } else {
    const entries = Object.entries(servers);

    if (entries.length === 0) {
      diagnostics.push({
        level: 'warning',
        message: 'mcpServers is present but empty.',
      });
    }

    for (const [name, server] of entries) {
      if (!isPlainObject(server)) {
        diagnostics.push({
          level: 'error',
          message: `${name} should be a server config object.`,
        });
        continue;
      }

      const command = server.command;
      const url = server.url;

      if (typeof command !== 'string' && typeof url !== 'string') {
        diagnostics.push({
          level: 'warning',
          message: `${name} has neither a command nor a url. Check whether this server can actually start.`,
        });
      }

      if (command !== undefined && typeof command !== 'string') {
        diagnostics.push({
          level: 'error',
          message: `${name}.command should be a string when provided.`,
        });
      }

      if (server.args !== undefined && !isStringArray(server.args)) {
        diagnostics.push({
          level: 'error',
          message: `${name}.args should be an array of strings when provided.`,
        });
      }

      if (server.env !== undefined && !isStringRecord(server.env)) {
        diagnostics.push({
          level: 'error',
          message: `${name}.env should be an object with string values when provided.`,
        });
      }

      if (typeof url === 'string') {
        diagnostics.push({
          level: 'warning',
          message: `${name} uses a remote URL. Confirm TLS, authentication, and what data the server can read before enabling it.`,
        });
      }

      if (containsLikelySecret(server)) {
        diagnostics.push({
          level: 'warning',
          message: `${name} appears to include a secret-like value. Prefer environment variables or a local secret store over shared config text.`,
        });
      }
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      level: 'ok',
      message:
        'JSON parses and follows the common mcpServers shape. Still verify exact fields with your client and each MCP server source.',
    });
  }

  return diagnostics;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isPlainObject(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function containsLikelySecret(value: unknown): boolean {
  const serialized = JSON.stringify(value).toLowerCase();
  return /(api[_-]?key|token|secret|password|bearer\s+[a-z0-9._-]+)/i.test(
    serialized
  );
}
