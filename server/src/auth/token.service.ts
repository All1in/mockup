import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env';
import type { User } from '../db/entities';

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 min ms
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict' as const,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days ms
};

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}


export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function signAccessToken(user: User, expiresIn?: string): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: 'access',
  };
  const exp = expiresIn ? parseExpiresInSeconds(expiresIn) ?? env.JWT_ACCESS_EXPIRES_IN : env.JWT_ACCESS_EXPIRES_IN;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: exp });
}

export function signRefreshToken(userId: string, jti: string, expiresIn?: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
  const exp = expiresIn ? parseExpiresInSeconds(expiresIn) ?? env.JWT_REFRESH_EXPIRES_IN : env.JWT_REFRESH_EXPIRES_IN;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: exp });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiresAt(expiresIn?: string): Date {
  const d = new Date();
  if (expiresIn) {
    const seconds = parseExpiresInSeconds(expiresIn);
    if (seconds !== null) {
      d.setSeconds(d.getSeconds() + seconds);
      return d;
    }
  }
  d.setDate(d.getDate() + 7);
  return d;
}

export function parseExpiresInSeconds(value: string): number | null {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default: return null;
  }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, cookieMaxAge?: { access?: number; refresh?: number }): void {
  const accessOpts = cookieMaxAge?.access
    ? { ...COOKIE_OPTIONS_ACCESS, maxAge: cookieMaxAge.access * 1000 }
    : COOKIE_OPTIONS_ACCESS;
  const refreshOpts = cookieMaxAge?.refresh
    ? { ...COOKIE_OPTIONS_REFRESH, maxAge: cookieMaxAge.refresh * 1000 }
    : COOKIE_OPTIONS_REFRESH;
  res.cookie(env.COOKIE_ACCESS_NAME, accessToken, accessOpts);
  res.cookie(env.COOKIE_REFRESH_NAME, refreshToken, refreshOpts);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(env.COOKIE_ACCESS_NAME, { path: '/', httpOnly: true, secure: env.cookieSecure, sameSite: 'strict' });
  res.clearCookie(env.COOKIE_REFRESH_NAME, { path: '/auth', httpOnly: true, secure: env.cookieSecure, sameSite: 'strict' });
}
