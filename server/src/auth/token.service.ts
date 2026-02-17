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
  path: '/auth/refresh',
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

export function signAccessToken(user: User): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN, jwtid: jti });
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

export function getRefreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(env.COOKIE_ACCESS_NAME, accessToken, COOKIE_OPTIONS_ACCESS);
  res.cookie(env.COOKIE_REFRESH_NAME, refreshToken, COOKIE_OPTIONS_REFRESH);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(env.COOKIE_ACCESS_NAME, { path: '/', httpOnly: true, secure: env.cookieSecure, sameSite: 'strict' });
  res.clearCookie(env.COOKIE_REFRESH_NAME, { path: '/auth/refresh', httpOnly: true, secure: env.cookieSecure, sameSite: 'strict' });
}
