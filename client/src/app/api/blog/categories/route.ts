import { NextResponse } from 'next/server';
import { getBlogCategoriesAggregated } from '@/features/blog/lib/blog.mock';
import { BlogCategoriesResponseSchema } from '@/features/blog/lib/blog.schemas';

export function GET() {
  const { categories, tags } = getBlogCategoriesAggregated();
  const payload = BlogCategoriesResponseSchema.parse({ categories, tags });
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    },
  });
}

