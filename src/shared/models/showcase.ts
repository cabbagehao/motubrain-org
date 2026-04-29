import { eq, desc, asc, ne, isNull, or, and, like, notLike, ilike, notIlike } from 'drizzle-orm';

import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';

export interface Showcase {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  prompt: string | null;
  image: string;
  tags: string | null;
  createdAt: Date;
}

export interface NewShowcase {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  prompt?: string | null;
  image: string;
  tags?: string | null;
}

export async function addShowcase(data: NewShowcase): Promise<Showcase | null> {
  try {
    const result = await db().insert(showcase).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error('Failed to add showcase:', error);
    return null;
  }
}

export interface GetLatestShowcasesOptions {
  limit?: number;
  tags?: string;
  excludeTags?: string;
  searchTerm?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getLatestShowcases({
  limit = 20,
  tags,
  excludeTags,
  searchTerm,
  sortOrder = 'desc',
}: GetLatestShowcasesOptions = {}): Promise<Showcase[]> {
  try {
    const conditions = [];

    if (tags) {
      // Support multiple tags separated by comma
      // All tags must be present in the showcase.tags field
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        // Use word boundary matching to avoid partial matches
        // e.g., "men" should not match "women"
        const tagConditions = tagList.map(tag => 
          or(
            ilike(showcase.tags, `${tag},%`),  // tag at start: "men,..."
            ilike(showcase.tags, `%,${tag},%`), // tag in middle: "...,men,..."
            ilike(showcase.tags, `%,${tag}`),   // tag at end: "...,men"
            ilike(showcase.tags, tag)           // tag alone: "men"
          )
        );
        conditions.push(and(...tagConditions));
      }
    }

    if (excludeTags) {
      conditions.push(
        or(notIlike(showcase.tags, `%${excludeTags}%`), isNull(showcase.tags))
      );
    }

    if (searchTerm) {
      conditions.push(
        or(
          ilike(showcase.prompt, `%${searchTerm}%`),
          ilike(showcase.title, `%${searchTerm}%`),
          ilike(showcase.tags, `%${searchTerm}%`)
        )
      );
    }

    let query = db()
      .select()
      .from(showcase);

    // Only apply where clause if there are conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query
      .orderBy(sortOrder === 'asc' ? asc(showcase.createdAt) : desc(showcase.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error('Failed to get showcases:', error);
    return [];
  }
}

export async function getUserShowcases(userId: string): Promise<Showcase[]> {
  try {
    const result = await db()
      .select()
      .from(showcase)
      .where(eq(showcase.userId, userId))
      .orderBy(desc(showcase.createdAt));
    return result;
  } catch (error) {
    console.error('Failed to get user showcases:', error);
    return [];
  }
}


export async function getShowcase(id: string): Promise<Showcase | null> {
  try {
    const result = await db()
      .select()
      .from(showcase)
      .where(eq(showcase.id, id));
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get showcase:', error);
    return null;
  }
}

export async function updateShowcase(
  id: string,
  data: Partial<NewShowcase>
): Promise<Showcase | null> {
  try {
    const result = await db()
      .update(showcase)
      .set(data)
      .where(eq(showcase.id, id))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error('Failed to update showcase:', error);
    return null;
  }
}

export async function deleteShowcase(id: string): Promise<boolean> {
  try {
    await db().delete(showcase).where(eq(showcase.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete showcase:', error);
    return false;
  }
}

export async function getShowcasesCount(): Promise<number> {
  try {
    const result = await db().select({ count: showcase.id }).from(showcase);
    return result.length;
  } catch (error) {
    console.error('Failed to get showcases count:', error);
    return 0;
  }
}

export async function getShowcases({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
}): Promise<Showcase[]> {
  try {
    const offset = (page - 1) * limit;
    const result = await db()
      .select()
      .from(showcase)
      .orderBy(desc(showcase.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  } catch (error) {
    console.error('Failed to get showcases:', error);
    return [];
  }
}
