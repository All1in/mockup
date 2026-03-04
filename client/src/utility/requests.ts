import type { AuthorizedUser } from '../models/auth';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<AuthorizedUser> | null = null;

export default async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  const url = new URL(endpoint, baseUrl).toString();

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    if (endpoint.includes('refresh')) {
      throw new ApiError('Unauthorized', 401);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = apiFetch<AuthorizedUser>('auth/refresh', {
          method: 'POST',
        });
      }

      await refreshPromise;
      return await apiFetch<T>(endpoint, options);
    } finally {
      refreshPromise = null;
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;

    if (res.headers.get('Content-Type')?.includes('application/json')) {
      try {
        message = JSON.parse(text).message ?? message;
      } catch {}
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
