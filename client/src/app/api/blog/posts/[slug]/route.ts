import { NextResponse } from 'next/server';
import { getBlogPostBySlug } from '@/features/blog/lib/blog.mock';
import { BlogPostResponseSchema } from '@/features/blog/lib/blog.schemas';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const post = typeof slug === 'string' ? (getBlogPostBySlug(slug) ?? null) : null;
  const payload = BlogPostResponseSchema.parse({ post });
  return NextResponse.json(payload, {
    status: post ? 200 : 404,
    headers: {
      'Cache-Control': post
        ? 'public, s-maxage=300, stale-while-revalidate=120'
        : 'public, s-maxage=30, stale-while-revalidate=30',
    },
  });
}

