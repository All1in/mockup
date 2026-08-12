import axios from 'axios';
import { toApiError } from '@/utils/Error';
import type { BlogCategoriesResponse, BlogPostResponse, BlogPostsListResponse } from '../lib/blog.types';

const internalApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  paramsSerializer: (params: Record<string, unknown>) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach(v => sp.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        sp.set(key, String(value));
      }
    }
    return sp.toString();
  },
});

export async function getBlogPosts(): Promise<BlogPostsListResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/posts');
    return data as BlogPostsListResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogPostsPage(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  tags?: string[];
}): Promise<BlogPostsListResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/posts', {
      params: {
        ...(typeof params?.limit === 'number' ? { limit: params.limit } : {}),
        ...(typeof params?.offset === 'number' ? { offset: params.offset } : {}),
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.tags?.length ? { tags: params.tags } : {}),
      },
    });
    return data as BlogPostsListResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogPost(slug: string): Promise<BlogPostResponse> {
  try {
    const { data } = await internalApi.get<unknown>(`/blog/posts/${encodeURIComponent(slug)}`);
    return data as BlogPostResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getBlogCategories(): Promise<BlogCategoriesResponse> {
  try {
    const { data } = await internalApi.get<unknown>('/blog/categories');
    return data as BlogCategoriesResponse;
  } catch (error) {
    throw toApiError(error);
  }
}

