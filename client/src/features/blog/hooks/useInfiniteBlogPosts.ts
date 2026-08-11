import { useInfiniteQuery } from '@tanstack/react-query';
import { getBlogPostsPage } from '../api/blog.api';
import { blogKeys, type BlogFilters } from './blog.keys';

const DEFAULT_LIMIT = 12;

export function useInfiniteBlogPosts(limit = DEFAULT_LIMIT, filters?: BlogFilters) {
  return useInfiniteQuery({
    queryKey: blogKeys.infinitePosts(limit, filters),
    queryFn: ({ pageParam }) =>
        getBlogPostsPage({
          limit,
          offset: typeof pageParam === 'number' ? pageParam : 0,
          category: filters?.category,
          tags: filters?.tags,
        }),
    getNextPageParam: lastPage =>
        lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    initialPageParam: 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

