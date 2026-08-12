import type { Response } from 'express';

/** Auth-related 401 error codes for client-side handling (refresh vs redirect to login). */
export const Auth401Code = {
  /** No access token in cookie or Authorization header — client should try refresh if it has refresh cookie. */
  ACCESS_TOKEN_MISSING: 'ACCESS_TOKEN_MISSING',
  /** Access token invalid or expired — client should call /auth/refresh and retry. */
  ACCESS_TOKEN_INVALID: 'ACCESS_TOKEN_INVALID',
  /** Refresh token missing, invalid, expired, or revoked — client must redirect to login. */
  REFRESH_TOKEN_MISSING: 'REFRESH_TOKEN_MISSING',
  REFRESH_INVALID: 'REFRESH_INVALID',
  REFRESH_REVOKED: 'REFRESH_REVOKED',
  REFRESH_EXPIRED: 'REFRESH_EXPIRED',
  /** Login failed (bad credentials). */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export type Auth401CodeType = (typeof Auth401Code)[keyof typeof Auth401Code];

/** 409 Conflict: concurrent refresh from another tab; client should retry refresh once. */
export const Auth409Code = {
  REFRESH_CONCURRENT: 'REFRESH_CONCURRENT',
} as const;

export type Auth409CodeType = (typeof Auth409Code)[keyof typeof Auth409Code];

export interface UnauthorizedBody {
  error: 'Unauthorized';
  message: string;
  code: Auth401CodeType;
}

export interface ConflictBody {
  error: 'Conflict';
  message: string;
  code: Auth409CodeType;
}

export function sendUnauthorized(res: Response, message: string, code: Auth401CodeType): void {
  res.status(401).json({ error: 'Unauthorized', message, code });
}

/** Send 409 with Retry-After so client can retry refresh (e.g. after another tab got new cookies). */
export function sendConflict(
  res: Response,
  message: string,
  code: Auth409CodeType,
  retryAfterSeconds = 1
): void {
  res.set('Retry-After', String(retryAfterSeconds));
  res.status(409).json({ error: 'Conflict', message, code });
}
