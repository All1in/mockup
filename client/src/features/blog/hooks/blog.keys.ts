export type BlogFilters = {
  category?: string;
  tags?: string[];
};

export const blogKeys = {
  all: ['blog'] as const,
  posts: () => [...blogKeys.all, 'posts'] as const,
  infinitePosts: (limit: number, filters?: BlogFilters) =>
      [...blogKeys.all, 'posts', 'infinite', limit, filters ?? {}] as const,
  post: (slug: string) => [...blogKeys.all, 'post', slug] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
};