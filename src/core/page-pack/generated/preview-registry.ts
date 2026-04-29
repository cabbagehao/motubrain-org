import { buildPreviewRegistryKey, type PreviewRegistryEntry } from '@/core/page-pack/registry';
import PreviewRoute0 from '../../../../page-packs/nano-banana-image-site/preview/routes/home/page';
import PreviewRoute1 from '../../../../page-packs/nano-banana-image-site/preview/routes/pricing/page';
import PreviewRoute2 from '../../../../page-packs/nano-banana-image-site/preview/routes/showcases/page';
import PreviewRoute3 from '../../../../page-packs/nano-banana-image-site/preview/routes/create/page';
import PreviewRoute4 from '../../../../page-packs/nano-banana-image-site/preview/routes/hairstyles/page';
import PreviewRoute5 from '../../../../page-packs/nano-banana-image-site/preview/routes/blog/page';
import PreviewRoute6 from '../../../../page-packs/nano-banana-image-site/preview/routes/updates/page';
import PreviewRoute7 from '../../../../page-packs/shipany2-home/preview/routes/home/page';

const registry = new Map<string, PreviewRegistryEntry>(
  Object.entries({
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site", sourcePage: "src/app/[locale]/(landing)/page.tsx", previewRoute: "routes/home/page.tsx", layoutKind: "landing", component: PreviewRoute0 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/pricing")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/pricing", sourcePage: "src/app/[locale]/(landing)/pricing/page.tsx", previewRoute: "routes/pricing/page.tsx", layoutKind: "landing", component: PreviewRoute1 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/showcases")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/showcases", sourcePage: "src/app/[locale]/(landing)/showcases/page.tsx", previewRoute: "routes/showcases/page.tsx", layoutKind: "landing", component: PreviewRoute2 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/create")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/create", sourcePage: "src/app/[locale]/(landing)/create/page.tsx", previewRoute: "routes/create/page.tsx", layoutKind: "landing", component: PreviewRoute3 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/hairstyles")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/hairstyles", sourcePage: "src/app/[locale]/(landing)/hairstyles/page.tsx", previewRoute: "routes/hairstyles/page.tsx", layoutKind: "landing", component: PreviewRoute4 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/blog")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/blog", sourcePage: "src/app/[locale]/(landing)/blog/page.tsx", previewRoute: "routes/blog/page.tsx", layoutKind: "landing", component: PreviewRoute5 },
  [buildPreviewRegistryKey("nano-banana-image-site", "/preview/packs/nano-banana-image-site/updates")]: { packName: "nano-banana-image-site", previewUrl: "/preview/packs/nano-banana-image-site/updates", sourcePage: "src/app/[locale]/(landing)/updates/page.tsx", previewRoute: "routes/updates/page.tsx", layoutKind: "landing", component: PreviewRoute6 },
  [buildPreviewRegistryKey("shipany2-home", "/preview/packs/shipany2-home")]: { packName: "shipany2-home", previewUrl: "/preview/packs/shipany2-home", sourcePage: "src/app/[locale]/(landing)/page.tsx", previewRoute: "routes/home/page.tsx", layoutKind: "landing", component: PreviewRoute7 }
  })
);

export function getPreviewRegistryEntry(
  packName: string,
  previewUrl: string
): PreviewRegistryEntry | null {
  return registry.get(buildPreviewRegistryKey(packName, previewUrl)) ?? null;
}
