import { api, API_BASE } from '../api/api';
import type { AuthResponse } from '../../types/apiTypes';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export { API_BASE };

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return API_BASE.startsWith('http') ? API_BASE : '';
  return API_BASE.startsWith('http') ? API_BASE : window.location.origin + API_BASE;
}

let tokenExpiresAt: number | null = null;

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

export function setTokenExpiresAt(expiresInSeconds: number): void {
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
}

function clearRefreshTimer(): void {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function scheduleRefreshTimer(expiresInSeconds: number): void {
  if (typeof window === 'undefined') return;
  clearRefreshTimer();
  if (expiresInSeconds <= 60) return;
  const delayMs = (expiresInSeconds - 60) * 1000;
  refreshTimerId = setTimeout(() => {
    refreshTimerId = null;
    api.post<AuthResponse>('/auth/refresh').then(
      (res) => {
        if (res.data?.accessExpiresIn) scheduleRefreshTimer(res.data.accessExpiresIn);
      }
    ).catch(() => {});
  }, delayMs);
}


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
  clearRefreshTimer();
  tokenExpiresAt = null;
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

function onVisibilityChange(): void {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
  if (tokenExpiresAt === null) return
  const now = Date.now()
  const bufferMs = 30_000
  if (now < tokenExpiresAt - bufferMs) return
  api.post<AuthResponse>('/auth/refresh').then(
    (res) => {
      if (res.data?.accessExpiresIn) {
        setTokenExpiresAt(res.data.accessExpiresIn)
        scheduleRefreshTimer(res.data.accessExpiresIn)
      }
    }
  ).catch(() => {})
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibilityChange)
}

api.interceptors.response.use(
  (response) => {
    const url = response.config.url ?? ''
    const data = response.data as { accessExpiresIn?: number } | undefined
    const expiresIn = data?.accessExpiresIn

    if (url.includes('/auth/logout')) {
      clearRefreshTimer();
      tokenExpiresAt = null;
      return response;
    }

    if ((url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) && typeof expiresIn === 'number') {
      setTokenExpiresAt(expiresIn);
      scheduleRefreshTimer(expiresIn);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (!error.config) {
      return Promise.reject(error)
    }

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