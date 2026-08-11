import { api, API_BASE } from '../api/api';
import type { AuthChannelMessage, AuthResponse } from '../../types/apiTypes';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export { API_BASE };

export const AUTH_INVALIDATE_EVENT = 'auth:invalidate';

function dispatchAuthInvalidate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_INVALIDATE_EVENT));
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return API_BASE.startsWith('http') ? API_BASE : '';
  return API_BASE.startsWith('http') ? API_BASE : window.location.origin + API_BASE;
}

const authChannel =
  typeof window !== 'undefined' ? new BroadcastChannel('auth') : null;

let tokenExpiresAt: number | null = null;
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
const AUTH_EXP_KEY = 'auth_exp';

export function setTokenExpiresAt(expiresInSeconds: number): void {
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  try {
    localStorage.setItem(AUTH_EXP_KEY, String(tokenExpiresAt));
  } catch {}
}

function clearPersistedExpiry(): void {
  tokenExpiresAt = null;
  try {
    localStorage.removeItem(AUTH_EXP_KEY);
  } catch {}
}

export function initAuthSession(expiresInSeconds: number): void {
  setTokenExpiresAt(expiresInSeconds);
  scheduleRefreshTimer(expiresInSeconds);
  authChannel?.postMessage({ type: 'login', expiresIn: expiresInSeconds });
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

  const delaySeconds = Math.max(expiresInSeconds - 60, 1);
  const delayMs = delaySeconds * 1000;

  refreshTimerId = setTimeout(() => {
    refreshTimerId = null;

    api.post<AuthResponse>('/auth/refresh')
      .then((res) => {
        if (res.data?.accessExpiresIn) {
          scheduleRefreshTimer(res.data.accessExpiresIn);
          authChannel?.postMessage({ type: 'refreshed', expiresIn: res.data.accessExpiresIn });
        }
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          onSessionExpired();
        } else {
          const retryMs = getRetryAfterMs(error);
          refreshTimerId = setTimeout(() => {
            scheduleRefreshTimer(60);
          }, retryMs);
        }
      });
  }, delayMs);
}

function clearSessionLocally(redirect: boolean = true): void {
  clearRefreshTimer();
  clearPersistedExpiry();
  if (!redirect || typeof window === 'undefined') return;
  if (window.location.pathname === '/sign-in') return;
  const path = window.location.pathname + window.location.search;
  const callbackUrl = path ? `?callbackUrl=${encodeURIComponent(path)}` : '';
  window.location.replace(`/sign-in${callbackUrl}`);
}

function onSessionExpired() {
  authChannel?.postMessage({ type: 'logout' });
  clearSessionLocally();
}

export function notifyLogoutAcrossTabs(): void {
  authChannel?.postMessage({ type: 'logout' });
  clearSessionLocally(false);
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
}

const REFRESH_CONCURRENT_CODE = 'REFRESH_CONCURRENT';

function isRefreshConcurrentError(err: AxiosError<{ code?: string }>): boolean {
  return err.response?.status === 409 && err.response?.data?.code === REFRESH_CONCURRENT_CODE;
}

function getRetryAfterMs(err: AxiosError): number {
  const sec = err.response?.headers?.['retry-after'];
  if (typeof sec === 'string') {
    const n = parseInt(sec, 10);
    if (Number.isFinite(n)) return n * 1000;
  }
  return 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function onVisibilityChange(): void {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (tokenExpiresAt === null) return;
  const now = Date.now();
  const bufferMs = 30_000;
  if (now < tokenExpiresAt - bufferMs) return;
  api.post<AuthResponse>('/auth/refresh').then(
    (res) => {
      if (res.data?.accessExpiresIn) {
        setTokenExpiresAt(res.data.accessExpiresIn);
        scheduleRefreshTimer(res.data.accessExpiresIn);
        authChannel?.postMessage({ type: 'refreshed', expiresIn: res.data.accessExpiresIn });
      }
    }
  ).catch(() => {
    onSessionExpired();
  });
}

if (authChannel) {
  authChannel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
    const msg = event.data;

    if (msg.type === 'logout') {
      clearSessionLocally();
    }

    if (msg.type === 'refreshed' || msg.type === 'login') {
      setTokenExpiresAt(msg.expiresIn);
      clearRefreshTimer();
      scheduleRefreshTimer(msg.expiresIn);
      if (msg.type === 'login') {
        dispatchAuthInvalidate();
      }
    }
  };
}

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(AUTH_EXP_KEY);
  if (stored) {
    const exp = parseInt(stored, 10);
    const remainingMs = exp - Date.now();
    if (remainingMs > 0) {
      tokenExpiresAt = exp;
      scheduleRefreshTimer(Math.floor(remainingMs / 1000));
    } else {
      localStorage.removeItem(AUTH_EXP_KEY);
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibilityChange);
}

api.interceptors.response.use(
  (response) => {
    const url = response.config.url ?? '';
    const data = response.data as { accessExpiresIn?: number } | undefined;
    const expiresIn = data?.accessExpiresIn;

    if (url.includes('/auth/logout')) {
      clearRefreshTimer();
      clearPersistedExpiry();
      return response;
    }

    if ((url.includes('/auth/register') || url.includes('/auth/refresh')) && typeof expiresIn === 'number') {
      setTokenExpiresAt(expiresIn);
      scheduleRefreshTimer(expiresIn);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const authPaths = ['/auth/login', '/auth/register', '/auth/logout'];
    if (authPaths.some(p => originalRequest.url?.includes(p))) {
      return Promise.reject(error);
    }

    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      onSessionExpired();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    isRefreshing = true;

    const doRefresh = (retried = false): Promise<void> =>
      api.post<AuthResponse>('/auth/refresh').then(
        (res) => {
          const expiresIn = res.data?.accessExpiresIn;
          if (expiresIn) {
            authChannel?.postMessage({ type: 'refreshed', expiresIn });
          }
          processQueue(null);
        },
        (err: AxiosError<{ code?: string }>) => {
          if (!retried && isRefreshConcurrentError(err)) {
            return sleep(getRetryAfterMs(err)).then(() => doRefresh(true));
          }
          processQueue(err);
          onSessionExpired();
          throw err;
        }
      );

    refreshPromise = doRefresh().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

    await refreshPromise;

    return api(originalRequest);
  }
);