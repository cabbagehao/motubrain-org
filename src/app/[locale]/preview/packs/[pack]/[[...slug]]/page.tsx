import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import LandingLayout from '@/app/[locale]/(landing)/layout';
import { getPreviewRegistryEntry } from '@/core/page-pack/generated/preview-registry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PagePackPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; pack: string; slug?: string[] }>;
}) {
  const { locale, pack, slug = [] } = await params;
  setRequestLocale(locale);

  const previewUrl = slug.length
    ? `/preview/packs/${pack}/${slug.join('/')}`
    : `/preview/packs/${pack}`;
  const entry = getPreviewRegistryEntry(pack, previewUrl);

  if (!entry) {
    notFound();
  }

  const Component = entry.component;
  const content = <Component params={Promise.resolve({ locale })} />;

  if (entry.layoutKind === 'landing') {
    return <LandingLayout>{content}</LandingLayout>;
  }

  return content;
}
