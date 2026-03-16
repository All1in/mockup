import { ApiErrorPayload } from '@/types/apiTypes';
import type { AxiosError } from 'axios';

export class ApiError extends Error {
  status?: number;
  code?: string;
  rawError?: string;

  constructor(message: string, opts?: { status?: number; code?: string; rawError?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.code = opts?.code;
    this.rawError = opts?.rawError;
  }
}

export function toApiError(err: unknown): ApiError {
  const fallback = new ApiError('Something went wrong');

  if (!(err as any)) return fallback;

  const ax = err as AxiosError<ApiErrorPayload>;
  const status = ax.response?.status;
  const data = ax.response?.data;

  if (data?.message) {
    return new ApiError(data.message, {
      status,
      code: data.code,
      rawError: data.error,
    });
  }

  if (err instanceof Error) return new ApiError(err.message);
  return fallback;
}