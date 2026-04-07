import type { Metadata } from 'next';
import { getBlogCategoriesAggregated, getFeaturedPost } from '@/features/blog/lib/blog.mock';
import { BlogHeroServer } from '@/features/blog/ui/BlogHeroServer';
import { BlogPageView } from '@/features/blog/ui/BlogPageView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles, insights, and updates.',
};

export default function BlogPage() {
  const featured = getFeaturedPost();
  const { categories, tags } = getBlogCategoriesAggregated();

  return (
    <BlogPageView
      serverFeaturedPost={featured ?? null}
      serverHero={featured ? <BlogHeroServer post={featured} /> : null}
      initialSidebarCategories={categories}
      initialSidebarTags={tags}
    />
  );
}
