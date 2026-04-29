import { NextRequest, NextResponse } from 'next/server';

import { getUuid } from '@/shared/lib/hash';
import { extractHairstyleTags } from '@/shared/lib/tags';
import { addShowcase, NewShowcase } from '@/shared/models/showcase';
import { getUserInfo } from '@/shared/models/user';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return NextResponse.json(
        { code: 401, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, prompt, image, tags } = body;

    if (!title?.trim() || !image?.trim()) {
      return NextResponse.json(
        { code: 400, message: 'Title and image are required' },
        { status: 400 }
      );
    }

    // Smart tag extraction: only when tags is "hairstyles" (from /create?prompt=hairstyles)
    let finalTags = tags;
    if (tags === 'hairstyles' && prompt) {
      // Extract more specific tags from the user's prompt
      finalTags = extractHairstyleTags(prompt, title);
      console.log(`Auto-extracted tags from prompt: "${prompt}" -> "${finalTags}"`);
    }

    const newShowcase: NewShowcase = {
      id: getUuid(),
      userId: user.id,
      title: title.trim(),
      prompt: prompt?.trim() || null,
      image: image.trim(),
      tags: finalTags || null,
    };

    const result = await addShowcase(newShowcase);

    if (!result) {
      return NextResponse.json(
        { code: 500, message: 'Failed to add showcase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('Add showcase error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
