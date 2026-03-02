import type { AuthorizedUser } from '../models/auth';

export class ApiError extends Error {
  status;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: null | Promise<AuthorizedUser> = null;

export default async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }

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
      throw new ApiError('Token dead', res.status);
    } else {
      try {
        if (refreshPromise === null) {
          refreshPromise = apiFetch<AuthorizedUser>('auth/refresh', {
            method: 'POST',
          });
        }
        await refreshPromise;
        return await apiFetch<T>(endpoint, options);
      } catch (err) {
        throw err;
      } finally {
        refreshPromise = null;
      }
    }
  }

  if (!res.ok) {
    const raw = await res.text();
    let message = '';
    if (res.headers.get('Content-Type')?.includes('application/json')) {
      try {
        const parsed = JSON.parse(raw);
        message = parsed.message;
      } catch (err) {
        message = raw;
      }
    } else {
      message = raw;
      if (!message) {
        message = res.statusText;
      }
    }

    throw new ApiError(message, res.status);
  }

  // success path
  if (res.status === 204) {
    return undefined as T;
  } else {
    return await res.json();
  }
}
