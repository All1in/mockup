export class ApiError extends Error {
  status;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export default async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL;

  const url = new URL(endpoint, baseUrl).toString();
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new ApiError(err.message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  } else {
    return await res.json();
  }
}
