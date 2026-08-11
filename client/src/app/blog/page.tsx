import type { Metadata } from 'next';
import { getBlogCategoriesAggregated, getFeaturedPost } from '@/features/blog/lib/blog.mock';
import { BlogHeroServer } from '@/features/blog/ui/BlogHeroServer';
import { BlogPageView } from '@/features/blog/ui/BlogPageView';
import { BlogSidebar } from '@/features/blog/ui/BlogSidebar';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import type { BlogFilters } from '@/features/blog/hooks/blog.keys';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles, insights, and updates.',
};

type SearchParams = Promise<{ category?: string; tags?: string | string[] }>;

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = params.category;
  const rawTags = params.tags;
  const filterTags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];

  const filters: BlogFilters = {
    ...(category ? { category } : {}),
    ...(filterTags.length > 0 ? { tags: filterTags } : {}),
  };

  const hasActiveFilters = Boolean(category || filterTags.length);
  const featured = hasActiveFilters ? null : getFeaturedPost();
  const { categories, tags: sidebarTags } = getBlogCategoriesAggregated();

  return (
    <ErrorBoundary>
      <BlogPageView
        filters={filters}
        serverFeaturedPost={featured ?? null}
        serverHero={featured ? <BlogHeroServer post={featured} /> : null}
        sidebar={
          <BlogSidebar
            categories={categories}
            tags={sidebarTags}
            activeCategory={category}
            activeTags={filterTags.length ? filterTags : undefined}
            basePath="/blog"
          />
        }
      />
    </ErrorBoundary>
  );
}