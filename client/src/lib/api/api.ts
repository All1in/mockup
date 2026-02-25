import { AuthUser, AuthResponse } from '@/types/apiTypes';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';


export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
});

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ message?: string }>).response?.data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>(
      `${API_URL}/auth/login`,
      { email, password },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const register = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>(
      `${API_URL}/auth/register`,
      { email, password, name },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const authMe = async (): Promise<AuthUser> => {
  try {
    const { data } = await api.get<AuthResponse>(`${API_URL}/auth/me`);
    return data.user;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post(`${API_URL}/auth/logout`, {});
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};


let isRefreshing = false
let refreshPromise: Promise<void> | null = null
let failedQueue: {
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}[] = []

function processQueue(error: unknown) {
  failedQueue.forEach(p => {
    if (error) p.reject(error)
    else p.resolve()
  })
  failedQueue = []
}

function onSessionExpired() {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname + window.location.search
    const callbackUrl = path && path !== '/sign-in' ? `?callbackUrl=${encodeURIComponent(path)}` : ''
    window.location.href = `/sign-in${callbackUrl}`
  }
}

const REFRESH_CONCURRENT_CODE = 'REFRESH_CONCURRENT'

function isRefreshConcurrentError(err: AxiosError<{ code?: string }>): boolean {
  return err.response?.status === 409 && err.response?.data?.code === REFRESH_CONCURRENT_CODE
}

function getRetryAfterMs(err: AxiosError): number {
  const sec = err.response?.headers?.['retry-after']
  if (typeof sec === 'string') {
    const n = parseInt(sec, 10)
    if (Number.isFinite(n)) return n * 1000
  }
  return 1000
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (!error.response) {
      return Promise.reject(error)
    }

    if (error.response.status !== 401) {
      return Promise.reject(error)
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      onSessionExpired()
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(originalRequest))
    }

    isRefreshing = true

    const doRefresh = (retried = false): Promise<void> =>
      api.post('/auth/refresh').then(
        () => {
          processQueue(null)
        },
        (err: AxiosError<{ code?: string }>) => {
          if (!retried && isRefreshConcurrentError(err)) {
            return sleep(getRetryAfterMs(err)).then(() => doRefresh(true))
          }
          processQueue(err)
          onSessionExpired()
          throw err
        }
      )

    refreshPromise = doRefresh().finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

    await refreshPromise

    return api(originalRequest)
  }
)