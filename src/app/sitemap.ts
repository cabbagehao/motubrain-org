import { MetadataRoute } from 'next';

import { getSitemapEntries } from '@/shared/lib/sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapEntries();
}
