'use client';

import { usePathname } from 'next/navigation';

import { footerBadgeMap, getFooterBadgesForPath } from './footer-badge-map';

export function FooterBadges() {
  const pathname = usePathname();
  const resolvedBadges = getFooterBadgesForPath(pathname, footerBadgeMap);

  if (!resolvedBadges?.length) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {resolvedBadges.map((badgeHtml, index) => (
        <div
          key={index}
          className="shrink-0"
          dangerouslySetInnerHTML={{ __html: badgeHtml }}
        />
      ))}
    </div>
  );
}
