export const blogKeys = {
  all: ['blog'] as const,
  posts: () => [...blogKeys.all, 'posts'] as const,
  infinitePosts: (limit: number) => [...blogKeys.all, 'posts', 'infinite', limit] as const,
  post: (slug: string) => [...blogKeys.all, 'post', slug] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
};

