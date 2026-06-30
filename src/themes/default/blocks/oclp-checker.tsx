'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Search, ShieldCheck } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

type OclpModel = {
  id: string;
  name: string;
  status: 'supported' | 'caution' | 'limited';
  note: string;
  tags: string[];
};

const knownModels: OclpModel[] = [
  {
    id: 'MacBookPro11,1',
    name: 'MacBook Pro 13-inch Late 2013 / Mid 2014',
    status: 'supported',
    note: 'Commonly checked for Sonoma and Sequoia OCLP planning. Confirm exact RAM and current native firmware before upgrading.',
    tags: ['legacy-metal', 'sequoia', 'sonoma'],
  },
  {
    id: 'iMac14,2',
    name: 'iMac 27-inch Late 2013',
    status: 'supported',
    note: 'A frequent OCLP target. Review graphics, Wi-Fi, and Bluetooth caveats before choosing the newest macOS.',
    tags: ['legacy-metal', 'sequoia', 'sonoma'],
  },
  {
    id: 'MacBookPro8,2',
    name: 'MacBook Pro 15-inch 2011',
    status: 'limited',
    note: 'Non-Metal graphics and 2011 GPU issues can be significant. Treat this as a high-risk planning case.',
    tags: ['non-metal', 'graphics', 'bluetooth'],
  },
  {
    id: 'MacPro5,1',
    name: 'Mac Pro 2010 / 2012',
    status: 'caution',
    note: 'Many setups depend on GPU and wireless card choices. Do not assume another user result applies to your hardware.',
    tags: ['gpu-dependent', 'wifi-bluetooth'],
  },
  {
    id: 'MacBookAir7,2',
    name: 'MacBook Air 13-inch 2015 / 2017',
    status: 'supported',
    note: 'Often checked for Sequoia/Sonoma planning. Verify current OCLP release notes before upgrading.',
    tags: ['sequoia', 'sonoma'],
  },
];

export function OclpChecker({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [query, setQuery] = useState(section.defaultModel || 'MacBookPro11,1');
  const normalizedQuery = query.trim().toLowerCase();
  const matched = useMemo(() => {
    return knownModels.find(
      (model) =>
        model.id.toLowerCase() === normalizedQuery ||
        model.name.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const result = matched || {
    id: query.trim() || 'Unknown model',
    name: 'Not in the quick checker list',
    status: 'caution' as const,
    note: 'Open the official Supported Models page and search for the exact Model Identifier from System Information. If it is not listed there, do not treat it as supported.',
    tags: ['verify-official-list'],
  };

  return (
    <section
      id={section.id}
      className={cn(
        'border-border bg-muted/25 border-y py-10 md:py-14',
        className
      )}
    >
      <div className="container grid gap-6 px-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-6">
        <div>
          <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {section.eyebrow || 'Unofficial OCLP planning checker'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {section.description}
          </p>
          <div className="mt-5 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            Motubrain.org is not affiliated with Dortania or OpenCore Legacy
            Patcher. This page is a planning aid, not a download mirror or
            success guarantee.
          </div>
        </div>

        <div className="border-border bg-background rounded-lg border p-4 shadow-sm">
          <label className="text-sm font-semibold">
            Mac model identifier
            <div className="mt-2 flex gap-2">
              <Input
                value={query}
                placeholder="MacBookPro11,1"
                onChange={(event) => {
                  setQuery(event.target.value);
                  trackOclpEvent('oclp_checker_input');
                }}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Check model"
                onClick={() => trackOclpEvent('oclp_checker_submit')}
              >
                <Search aria-hidden="true" />
              </Button>
            </div>
          </label>

          <div className="border-border bg-muted/30 mt-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {result.status === 'supported' ? (
                <CheckCircle2 className="mt-1 size-5 text-emerald-600" />
              ) : result.status === 'limited' ? (
                <AlertTriangle className="mt-1 size-5 text-amber-600" />
              ) : (
                <ShieldCheck className="mt-1 size-5 text-blue-600" />
              )}
              <div>
                <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                  {result.status === 'supported'
                    ? 'Likely supported in official list'
                    : result.status === 'limited'
                      ? 'Supported with important caveats'
                      : 'Verify against official docs'}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{result.id}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {result.name}
                </p>
                <p className="mt-3 leading-7">{result.note}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-border bg-background text-muted-foreground rounded-md border px-2 py-1 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            {(section.sources || []).map(
              (source: { title: string; url: string }) => (
                <Link
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="border-border hover:bg-muted rounded-md border px-3 py-2 font-medium transition"
                >
                  {source.title}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function trackOclpEvent(eventName: string) {
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
  gtag?.('event', eventName, {
    page_group: 'oclp_checker',
  });
}
