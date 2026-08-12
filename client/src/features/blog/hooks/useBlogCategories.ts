import { useQuery } from '@tanstack/react-query';
import { getBlogCategories } from '../api/blog.api';
import { blogKeys } from './blog.keys';

export function useBlogCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: getBlogCategories,
    staleTime: 5 * 60_000
  });
}

