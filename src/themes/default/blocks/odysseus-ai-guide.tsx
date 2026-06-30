'use client';

import {
  BookOpenText,
  ExternalLink,
  Github,
  MonitorCog,
  ShieldAlert,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

type SourceLink = {
  title: string;
  description: string;
  url: string;
  kind: 'official' | 'repo' | 'docs' | 'discussion';
};

const iconByKind = {
  official: MonitorCog,
  repo: Github,
  docs: BookOpenText,
  discussion: ExternalLink,
} as const;

export function OdysseusAiGuide({
  section,
  className,
}: {
  section: Section & {
    sources?: SourceLink[];
    warnings?: string[];
  };
  className?: string;
}) {
  const sources = section.sources || [];
  const warnings = section.warnings || [];

  return (
    <section
      id={section.id}
      className={cn('border-border bg-muted/25 border-y py-10 md:py-14', className)}
    >
      <div className="container grid gap-6 px-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-6">
        <div>
          <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {section.eyebrow || 'Independent source guide'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {section.description}
          </p>

          <div className="border-border bg-background mt-5 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 size-4 shrink-0" />
              <div>
                <p className="font-medium">Independent guide boundary</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  Motubrain.org is not affiliated with Odysseus, PewDiePie, or
                  the Archdaemon repository. Use the official links before
                  installing or exposing a local AI workspace.
                </p>
              </div>
            </div>
          </div>

          {warnings.length ? (
            <ul className="text-muted-foreground mt-5 space-y-2 text-sm leading-6">
              {warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <span aria-hidden="true">-</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-3">
          {sources.map((source) => {
            const Icon = iconByKind[source.kind] || ExternalLink;
            return (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackOdysseusEvent(source.kind, source.url)}
                className="border-border bg-background hover:bg-muted/40 rounded-lg border p-4 transition"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-1 size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">{source.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {source.description}
                    </p>
                    <span className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium">
                      Open source
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function trackOdysseusEvent(kind: string, url: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const gtag = (
    window as Window & {
      gtag?: (
        command: 'event',
        eventName: string,
        params?: Record<string, string>
      ) => void;
    }
  ).gtag;
  gtag?.('event', 'odysseus_source_click', {
    page_group: 'odysseus_ai',
    source_kind: kind,
    outbound_url: url,
  });
}
