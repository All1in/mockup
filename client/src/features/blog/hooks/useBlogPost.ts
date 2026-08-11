import { useQuery } from '@tanstack/react-query';
import { getBlogPost } from '../api/blog.api';
import { blogKeys } from './blog.keys';

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: blogKeys.post(slug),
    queryFn: () => getBlogPost(slug),
    enabled: Boolean(slug),
  });
}

