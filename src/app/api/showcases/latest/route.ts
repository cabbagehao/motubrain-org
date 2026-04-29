import { NextRequest, NextResponse } from 'next/server';

import { getLatestShowcases } from '@/shared/models/showcase';
import { getPrompts, PromptStatus } from '@/shared/models/prompt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const tags = searchParams.get('tags') || undefined;
    const excludeTags = searchParams.get('excludeTags') || undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const usePrompts = searchParams.get('usePrompts') === 'true';

    console.log('Fetching latest showcases with params:', { limit, tags, excludeTags, searchTerm, sortOrder, usePrompts });
    
    try {
      // If usePrompts flag is set, fetch from prompts table
      if (usePrompts) {
        const prompts = await getPrompts({
          page: 1,
          limit,
          status: PromptStatus.PUBLISHED,
        });
        
        // Transform prompts to match showcase format
        // Use promptTitle as title for the "Create Similar" button
        const transformedData = prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.promptTitle,
          description: prompt.description,
          prompt: prompt.promptTitle,
          image: prompt.image || '',
          createdAt: prompt.createdAt.toISOString(),
        }));
        
        console.log(`Found ${transformedData.length} prompts`);
        
        return NextResponse.json({
          code: 0,
          message: 'success',
          data: transformedData,
        });
      }
      
      // Otherwise, fetch from showcases table
      const showcases = await getLatestShowcases({
        limit,
        tags,
        excludeTags,
        searchTerm,
        sortOrder,
      });
      console.log(`Found ${showcases.length} showcases`);
      
      return NextResponse.json({
        code: 0,
        message: 'success',
        data: showcases,
      });
    } catch (err: any) {
       console.error('Error fetching showcases inside route handler:', err);
       throw err;
    }
  } catch (error: any) {
    console.error('Get showcases error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
