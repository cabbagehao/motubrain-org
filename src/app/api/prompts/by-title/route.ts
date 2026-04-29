import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { prompt } from '@/config/db/schema';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title');

    if (!title) {
      return NextResponse.json(
        { error: 'Title parameter is required' },
        { status: 400 }
      );
    }

    const result = await db()
      .select()
      .from(prompt)
      .where(eq(prompt.promptTitle, title))
      .limit(1);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Get prompt by title error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get prompt' },
      { status: 500 }
    );
  }
}
