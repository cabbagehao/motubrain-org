export type PagePackManifest = {
  name: string;
  title: string;
  description: string;
  version: number;
  messageNamespaces?: string[];
  managedPaths: string[];
};

export type PagePackPreviewRoute = {
  previewUrl: string;
  sourcePage: string;
  previewRoute: string;
};

export type PagePackPreviewManifest = {
  routes: PagePackPreviewRoute[];
};

export type PagePackDefinition = {
  packRoot: string;
  previewRoot: string;
  sourceRoot: string;
  manifest: PagePackManifest;
  preview: PagePackPreviewManifest;
  sourcePages: string[];
};
