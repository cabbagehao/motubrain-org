import { buildPreviewRegistryKey, type PreviewRegistryEntry } from '@/core/page-pack/registry';

const registry = new Map<string, PreviewRegistryEntry>(
  Object.entries({

  })
);

export function getPreviewRegistryEntry(
  packName: string,
  previewUrl: string
): PreviewRegistryEntry | null {
  return registry.get(buildPreviewRegistryKey(packName, previewUrl)) ?? null;
}
