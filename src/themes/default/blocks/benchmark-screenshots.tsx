'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function BenchmarkScreenshots({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn('bg-muted py-16 md:py-24', section.className, className)}
    >
      <div className="container space-y-10">
        <div className="mx-auto max-w-4xl text-center text-balance">
          <h2 className="text-foreground mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground text-lg">{section.description}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {section.items?.map((item) => (
            <article
              key={item.title}
              className="bg-background overflow-hidden rounded-lg border shadow-sm"
            >
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="block w-full cursor-zoom-in bg-white text-left"
                    aria-label={`View ${item.title} screenshot larger`}
                  >
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={item.image?.src || ''}
                        alt={item.image?.alt || item.title || ''}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-contain p-3"
                      />
                    </div>
                  </button>
                </DialogTrigger>

                <DialogContent className="h-[92vh] w-[96vw] max-w-none gap-3 p-4 sm:max-w-none">
                  <DialogTitle className="sr-only">{item.title}</DialogTitle>
                  <div className="grid h-full w-full place-items-center overflow-auto bg-white p-3">
                    <Image
                      src={item.image?.src || ''}
                      alt={item.image?.alt || item.title || ''}
                      width={item.image?.width || 1080}
                      height={item.image?.height || 612}
                      sizes={`${item.image?.width || 1080}px`}
                      className="h-auto w-auto max-w-none object-contain"
                      style={{
                        width: item.image?.width || 1080,
                        height: item.image?.height || 'auto',
                        maxWidth: 'none',
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-2 p-5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  {item.url ? (
                    <a
                      href={item.url}
                      target={item.target || '_blank'}
                      rel={
                        (item.target || '_blank') === '_blank'
                          ? 'noreferrer'
                          : ''
                      }
                      className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none"
                      aria-label={`Open source leaderboard for ${item.title}`}
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
