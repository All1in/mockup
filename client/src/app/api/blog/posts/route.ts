import { NextResponse } from 'next/server';
import { BLOG_POSTS } from '@/features/blog/lib/blog.mock';
import { BlogPostsListResponseSchema } from '@/features/blog/lib/blog.schemas';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT);
  const rawOffset = Number(searchParams.get('offset') ?? 0);

  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;

  const category = searchParams.get('category')?.trim().toLowerCase() ?? null;
  const tags = searchParams.getAll('tags').map(t => t.trim().toLowerCase()).filter(Boolean);

  let filtered = BLOG_POSTS;

  if (category) {
    filtered = filtered.filter(p => p.category.toLowerCase() === category);
  }

  if (tags.length > 0) {
    filtered = filtered.filter(p =>
      tags.every(tag => p.tags.map(t => t.toLowerCase()).includes(tag))
    );
  }

  const total = filtered.length;
  const posts = filtered.slice(offset, offset + limit);

  const payload = BlogPostsListResponseSchema.parse({
    posts,
    total,
    limit,
    offset,
    hasMore: offset + posts.length < total,
  });

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}

