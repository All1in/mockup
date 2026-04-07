import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogCategoriesAggregated, getBlogPostBySlug } from '@/features/blog/lib/blog.mock';
import { BlogPostPageView } from '@/features/blog/ui/BlogPostPageView';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) {
    return { title: 'Post not found | Blog' };
  }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      images: [{ url: post.coverImage, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const { categories, tags } = getBlogCategoriesAggregated();
  return <BlogPostPageView post={post} categories={categories} tags={tags} />;
}
