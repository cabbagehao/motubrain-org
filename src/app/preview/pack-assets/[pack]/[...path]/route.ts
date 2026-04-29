import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function normalizeAssetSegments(segments: string[]) {
  if (
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid asset path');
  }

  return segments.join('/');
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ pack: string; path: string[] }>;
  }
) {
  const { pack, path: assetSegments } = await params;

  try {
    const assetPath = normalizeAssetSegments(assetSegments);
    const fullPath = path.join(
      process.cwd(),
      'page-packs',
      pack,
      'source',
      'public',
      'packs',
      pack,
      assetPath
    );
    const data = await readFile(fullPath);
    const mimeType =
      MIME_TYPES[path.extname(fullPath).toLowerCase()] ??
      'application/octet-stream';

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
