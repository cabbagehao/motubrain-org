type ThemeModule = Record<string, any>;
type ThemeModuleLoader = () => Promise<ThemeModule>;

const defaultPageLoaders: Record<string, ThemeModuleLoader> = {
  'dynamic-page': () => import('@/themes/default/pages/dynamic-page'),
  'static-page': () => import('@/themes/default/pages/static-page'),
};

const defaultLayoutLoaders: Record<string, ThemeModuleLoader> = {
  landing: () => import('@/themes/default/layouts/landing'),
};

const defaultBlockLoaders: Record<string, ThemeModuleLoader> = {
  blog: () => import('@/themes/default/blocks/blog'),
  'blog-detail': () => import('@/themes/default/blocks/blog-detail'),
  cta: () => import('@/themes/default/blocks/cta'),
  'custom-features': () => import('@/themes/default/blocks/custom-features'),
  faq: () => import('@/themes/default/blocks/faq'),
  features: () => import('@/themes/default/blocks/features'),
  'features-accordion': () =>
    import('@/themes/default/blocks/features-accordion'),
  'features-flow': () => import('@/themes/default/blocks/features-flow'),
  'features-list': () => import('@/themes/default/blocks/features-list'),
  'features-media': () => import('@/themes/default/blocks/features-media'),
  'features-step': () => import('@/themes/default/blocks/features-step'),
  footer: () => import('@/themes/default/blocks/footer'),
  'footer-badges': () => import('@/themes/default/blocks/footer-badges'),
  header: () => import('@/themes/default/blocks/header'),
  hero: () => import('@/themes/default/blocks/hero'),
  logos: () => import('@/themes/default/blocks/logos'),
  'page-detail': () => import('@/themes/default/blocks/page-detail'),
  pricing: () => import('@/themes/default/blocks/pricing'),
  showcases: () => import('@/themes/default/blocks/showcases'),
  'showcases-flow': () => import('@/themes/default/blocks/showcases-flow'),
  'showcases-flow-dynamic': () =>
    import('@/themes/default/blocks/showcases-flow-dynamic'),
  'social-avatars': () => import('@/themes/default/blocks/social-avatars'),
  stats: () => import('@/themes/default/blocks/stats'),
  subscribe: () => import('@/themes/default/blocks/subscribe'),
  testimonials: () => import('@/themes/default/blocks/testimonials'),
  updates: () => import('@/themes/default/blocks/updates'),
};

const themeRegistries = {
  default: {
    pages: defaultPageLoaders,
    layouts: defaultLayoutLoaders,
    blocks: defaultBlockLoaders,
  },
};

export function getRegisteredThemeModuleLoader({
  theme,
  kind,
  name,
}: {
  theme: string;
  kind: 'pages' | 'layouts' | 'blocks';
  name: string;
}) {
  return themeRegistries[theme as keyof typeof themeRegistries]?.[kind]?.[name];
}
