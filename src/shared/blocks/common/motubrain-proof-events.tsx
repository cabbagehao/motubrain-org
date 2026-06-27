'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import {
  markGaSessionEvent,
  trackAccessStatusClick,
  trackBenchmarkTableView,
  trackBenchmarkView,
  trackResourceOutboundClick,
  trackSourceLinkClick,
} from '@/shared/lib/ga4';

type ResourceClassification = {
  resourceId: string;
  destinationType: string;
  isPrimarySource: boolean;
};

const knownResourceHosts: Record<
  string,
  Omit<ResourceClassification, 'resourceId'>
> = {
  'www.shengshu.com': {
    destinationType: 'official',
    isPrimarySource: true,
  },
  'shengshu.com': {
    destinationType: 'official',
    isPrimarySource: true,
  },
  'www.prnewswire.com': {
    destinationType: 'launch_announcement',
    isPrimarySource: true,
  },
  'prnewswire.com': {
    destinationType: 'launch_announcement',
    isPrimarySource: true,
  },
  'world-arena.ai': {
    destinationType: 'benchmark',
    isPrimarySource: true,
  },
  'robotwin-platform.github.io': {
    destinationType: 'benchmark',
    isPrimarySource: true,
  },
  'arxiv.org': {
    destinationType: 'paper',
    isPrimarySource: true,
  },
  'www.nvidia.com': {
    destinationType: 'glossary',
    isPrimarySource: true,
  },
  'nvidia.com': {
    destinationType: 'glossary',
    isPrimarySource: true,
  },
  'huggingface.co': {
    destinationType: 'benchmark',
    isPrimarySource: true,
  },
  'motus-robotics.github.io': {
    destinationType: 'research_background',
    isPrimarySource: true,
  },
};

function getPageType(pathname: string) {
  const normalizedPathname = pathname.replace(/^\/(en|zh)(?=\/|$)/, '') || '/';

  if (normalizedPathname === '/') return 'homepage';
  if (normalizedPathname === '/world-action-model') return 'wam_glossary';
  if (normalizedPathname === '/benchmarks') return 'benchmarks';
  if (normalizedPathname === '/access-status') return 'access_status';
  if (normalizedPathname.includes('privacy-policy')) return 'policy';
  if (normalizedPathname.includes('terms-of-service')) return 'policy';

  return 'other';
}

function resolveUrl(href: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return new URL(href, window.location.href);
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined;
}

function getAnchorSection(anchor: HTMLAnchorElement) {
  const section = anchor.closest('section[id]');
  if (section?.id) {
    return section.id;
  }

  const articleSection = anchor.closest('[id]');
  return articleSection?.id || undefined;
}

function classifyResource(url: URL, linkText?: string): ResourceClassification {
  const host = url.hostname.toLowerCase();
  const known = knownResourceHosts[host];
  const resourceId =
    known?.destinationType ||
    normalizeText(linkText)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') ||
    host.replace(/[^a-z0-9]+/g, '_');

  if (known) {
    return {
      ...known,
      resourceId,
    };
  }

  return {
    resourceId,
    destinationType: 'external_resource',
    isPrimarySource: false,
  };
}

function isAccessStatusPath(url: URL) {
  return (
    url.origin === window.location.origin && url.pathname === '/access-status'
  );
}

export function MotubrainProofEvents() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    const pageType = getPageType(pathname);

    if (
      pageType === 'benchmarks' &&
      markGaSessionEvent(`benchmark_table_view:${pathname}`)
    ) {
      trackBenchmarkTableView({
        pageType,
        sourcePage: pathname,
        section: 'benchmark-snapshot',
        entryPoint: 'page_view',
        resourceId: 'worldarena_robotwin_table',
        destinationType: 'benchmark_table',
      });
    }

    const benchmarkSection = document.getElementById('benchmark-screenshots');
    if (!benchmarkSection || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (markGaSessionEvent(`benchmark_view:${pathname}`)) {
            trackBenchmarkView({
              pageType,
              sourcePage: pathname,
              section: 'benchmark-screenshots',
              entryPoint: 'section_view',
              resourceId: 'homepage_leaderboard_screenshots',
              destinationType: 'benchmark_screenshot',
            });
          }

          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(benchmarkSection);

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
        return;
      }

      const url = resolveUrl(href);
      if (!url) {
        return;
      }

      const pageType = getPageType(window.location.pathname);
      const sourcePage = window.location.pathname;
      const section = getAnchorSection(anchor);
      const linkText = normalizeText(anchor.textContent);

      if (isAccessStatusPath(url)) {
        trackAccessStatusClick({
          pageType,
          sourcePage,
          section,
          entryPoint: 'internal_link',
          resourceId: 'access_status',
          destinationType: 'status_page',
          linkText,
        });
      }

      if (url.origin === window.location.origin) {
        return;
      }

      const classification = classifyResource(url, linkText);
      const commonParams = {
        pageType,
        sourcePage,
        section,
        entryPoint: 'external_link',
        resourceId: classification.resourceId,
        destinationType: classification.destinationType,
        destinationHost: url.hostname.toLowerCase(),
        linkText,
      };

      trackResourceOutboundClick(commonParams);

      if (classification.isPrimarySource || section === 'source-map') {
        trackSourceLinkClick(commonParams);
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
