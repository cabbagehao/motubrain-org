import type React from 'react';

export type PreviewLayoutKind = 'landing' | 'plain';

export type PreviewRouteComponent = (props: {
  params: Promise<{ locale: string }>;
}) => Promise<React.ReactNode> | React.ReactNode;

export type PreviewRegistryEntry = {
  packName: string;
  previewUrl: string;
  sourcePage: string;
  previewRoute: string;
  layoutKind: PreviewLayoutKind;
  component: PreviewRouteComponent;
};

export function buildPreviewRegistryKey(packName: string, previewUrl: string) {
  return `${packName}::${previewUrl}`;
}
