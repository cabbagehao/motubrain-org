import { NextRequest, NextResponse } from 'next/server';
import { getPrompts, PromptStatus } from '@/shared/models/prompt';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const prompts = await getPrompts({
      page,
      limit,
      status: PromptStatus.PUBLISHED,
    });

    return NextResponse.json({
      success: true,
      data: prompts,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get prompts' },
      { status: 500 }
    );
  }
}
