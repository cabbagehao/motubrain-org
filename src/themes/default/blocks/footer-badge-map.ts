export type FooterBadgeMap = Record<string, string[]>;

export const footerBadgeMap: FooterBadgeMap = {
  // '/pricing': [`<a href="https://example.com" target="_blank" rel="noopener">Featured on Example</a>`],
  '/': [
    // `<a href="https://open-launch.com/projects/gpt-image-two" target="_blank" rel="noopener"><img src="https://open-launch.com/api/badge/f772a4bb-71d6-48ef-af09-81963409c61d/featured-icon.svg" alt="Featured on Open-Launch" width="130" height="36" /></a>`,
    // `<a href="https://startupfa.me/s/productx?utm_source=productx.video" target="_blank"><img src="https://startupfa.me/badges/featured-badge-small.webp" alt="ProductX - Featured on Startup Fame" width="224" height="36" /></a>`,
    // `<a href="https://fazier.com" target="_blank"><img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light" width=120 alt="Fazier badge" /></a>`,
    // `<a href="https://turbo0.com/item/gpt-image-2-reference-editor" target="_blank" rel="noopener noreferrer"><img src="https://img.turbo0.com/badge-listed-light.svg" alt="Listed on Turbo0" style="height: 54px; width: auto;" /></a>`,
  ],
};

export function getFooterBadgesForPath(
  pathname?: string | null,
  badgeMap: FooterBadgeMap = footerBadgeMap
) {
  if (!pathname) {
    return undefined;
  }

  return badgeMap[pathname];
}
