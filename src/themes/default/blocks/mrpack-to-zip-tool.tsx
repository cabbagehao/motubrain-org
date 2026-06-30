'use client';

import { useState } from 'react';
import { Download, FileArchive, ShieldCheck } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

export function MrpackToZipTool({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [fileName, setFileName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');

  function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    setFileName(file.name);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    const blob = file.slice(0, file.size, 'application/zip');
    const url = URL.createObjectURL(blob);
    const nextName = file.name.replace(/\.mrpack$/i, '') || 'modpack';
    setDownloadUrl(url);
    setDownloadName(`${nextName}.zip`);
    trackMrpackEvent('mrpack_loaded');
  }

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
            {section.eyebrow || 'Browser-local modpack utility'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {section.description}
          </p>
          <div className="border-border bg-background mt-5 flex items-start gap-3 rounded-md border px-3 py-2 text-sm leading-6">
            <ShieldCheck className="mt-1 size-4 shrink-0" />
            <span>
              The file is handled in your browser. This tool does not inspect,
              upload, or validate mod compatibility.
            </span>
          </div>
        </div>

        <div className="border-border bg-background rounded-lg border p-4 shadow-sm">
          <label className="border-border bg-muted/30 hover:bg-muted/50 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition">
            <FileArchive className="text-muted-foreground size-10" />
            <span className="mt-4 text-lg font-semibold">
              Choose .mrpack file
            </span>
            <span className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
              A .mrpack file is ZIP-based, so the conversion creates a .zip copy
              for tools that need the archive extension.
            </span>
            <input
              type="file"
              accept=".mrpack,application/zip"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0] || null)}
            />
          </label>

          {fileName ? (
            <div className="border-border mt-4 rounded-md border p-3">
              <p className="text-muted-foreground text-sm">Selected file</p>
              <p className="mt-1 font-medium">{fileName}</p>
              <Button
                asChild
                className="mt-3"
                disabled={!downloadUrl}
                onClick={() => trackMrpackEvent('mrpack_zip_download')}
              >
                <a href={downloadUrl} download={downloadName}>
                  <Download aria-hidden="true" />
                  Download ZIP copy
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function trackMrpackEvent(eventName: string) {
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
    page_group: 'mrpack_tools',
  });
}
