'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { getBlogPostsPage } from '../api/blog.api';
import { blogKeys } from './blog.keys';

const DEFAULT_LIMIT = 12;
const DEFAULT_MAX_PAGES = 6;

export function useInfiniteBlogPosts(limit = DEFAULT_LIMIT) {
  return useInfiniteQuery({
    queryKey: blogKeys.infinitePosts(limit),
    queryFn: ({ pageParam }) =>
      getBlogPostsPage({
        limit,
        offset: typeof pageParam === 'number' ? pageParam : 0,
      }),
    getNextPageParam: lastPage =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    initialPageParam: 0,
    maxPages: DEFAULT_MAX_PAGES,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

