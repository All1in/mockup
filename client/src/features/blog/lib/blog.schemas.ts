import { z } from 'zod';

export const BlogAuthorSchema = z.object({
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  role: z.string().min(1).optional(),
});

export const BlogContentSectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    text: z.string().min(1),
    level: z.number().int().min(2).max(4).default(2),
  }),
  z.object({
    type: z.literal('paragraph'),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal('quote'),
    text: z.string().min(1),
    by: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('list'),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string().url(),
    alt: z.string().min(1),
    caption: z.string().min(1).optional(),
  }),
]);

export const BlogPostSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.array(BlogContentSectionSchema).min(1),
  coverImage: z.string().url(),
  author: BlogAuthorSchema,
  publishedAt: z.string().datetime(),
  readingTime: z.number().int().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  featured: z.boolean().default(false),
});

export const BlogPostsListResponseSchema = z.object({
  posts: z.array(BlogPostSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const BlogPostResponseSchema = z.object({
  post: BlogPostSchema.nullable(),
});

export const BlogCategorySchema = z.object({
  name: z.string().min(1),
  count: z.number().int().min(0),
});

export const BlogCategoriesResponseSchema = z.object({
  categories: z.array(BlogCategorySchema),
  tags: z.array(z.object({ name: z.string().min(1), count: z.number().int().min(0) })),
});

