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
      throw new ApiError(message, res.status);
    } else {
      message = raw;
      if (!message) {
        message = res.statusText;
      }
      throw new ApiError(message, res.status);
    }

    // if (res.headers.get('Content-Type')?.includes('application/json')) {
    //   try {
    //     const err = await res.json();
    //     throw new ApiError(err.message, res.status);
    //   } catch (err) {
    //     const errMsg = await res.text();
    //     throw new ApiError(`Error ${errMsg}`, res.status);
    //   }
    // }
  }

  if (res.status === 204) {
    return undefined as T;
  } else {
    return await res.json();
  }
}
