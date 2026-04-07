import axios from 'axios';
import { toApiError } from '@/utils/Error';
import {
  BlogCategoriesResponseSchema,
  BlogPostResponseSchema,
  BlogPostsListResponseSchema,
} from '../lib/blog.schemas';
import type { BlogCategoriesResponse, BlogPostResponse, BlogPostsListResponse } from '../lib/blog.types';

const internalApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export async function getBlogPosts(): Promise<BlogPostsListResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/posts');
    return BlogPostsListResponseSchema.parse(data) satisfies BlogPostsListResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogPostsPage(params?: { limit?: number; offset?: number }): Promise<BlogPostsListResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/posts', {
      params: {
        ...(typeof params?.limit === 'number' ? { limit: params.limit } : {}),
        ...(typeof params?.offset === 'number' ? { offset: params.offset } : {}),
      },
    });
    return BlogPostsListResponseSchema.parse(data) satisfies BlogPostsListResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogPost(slug: string): Promise<BlogPostResponse> {
  try {
    const { data } = await internalApi.get<unknown>(`/blog/posts/${encodeURIComponent(slug)}`);
    return BlogPostResponseSchema.parse(data) satisfies BlogPostResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogCategories(): Promise<BlogCategoriesResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/categories');
    return BlogCategoriesResponseSchema.parse(data) satisfies BlogCategoriesResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

