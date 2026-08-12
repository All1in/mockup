import type { z } from 'zod';
import type {
  BlogAuthorSchema,
  BlogCategorySchema,
  BlogCategoriesResponseSchema,
  BlogContentSectionSchema,
  BlogPostResponseSchema,
  BlogPostsListResponseSchema,
  BlogPostSchema,
} from './blog.schemas';

export type BlogAuthor = z.infer<typeof BlogAuthorSchema>;
export type BlogContentSection = z.infer<typeof BlogContentSectionSchema>;
export type BlogPost = z.infer<typeof BlogPostSchema>;

export type BlogPostsListResponse = z.infer<typeof BlogPostsListResponseSchema>;
export type BlogPostResponse = z.infer<typeof BlogPostResponseSchema>;

export type BlogCategory = z.infer<typeof BlogCategorySchema>;
export type BlogCategoriesResponse = z.infer<typeof BlogCategoriesResponseSchema>;

export type BlogCategoryAgg = { name: string; count: number };
export type BlogTagAgg = { name: string; count: number };

