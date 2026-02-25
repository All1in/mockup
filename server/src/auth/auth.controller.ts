import type { Request, Response } from 'express';
import { AuthService, AuthError, EmailTakenError, type TokenTTL } from './auth.service';
import { setAuthCookies, clearAuthCookies, parseExpiresInSeconds, getAccessTokenExpiresInSeconds } from './token.service';
import { env } from '../config/env';
import { sendUnauthorized, sendConflict, Auth401Code, Auth409Code } from './auth.errors';

const MIN_PASSWORD_LENGTH = 8;
const EXPIRES_IN_PATTERN = /^\d+(s|m|h|d)$/;

function extractDevTTL(body: Record<string, unknown>): { ttl?: TokenTTL; cookieMaxAge?: { access?: number; refresh?: number } } {
  if (env.NODE_ENV === 'production') return {};
  const accessExpiresIn = typeof body.accessExpiresIn === 'string' && EXPIRES_IN_PATTERN.test(body.accessExpiresIn) ? body.accessExpiresIn : undefined;
  const refreshExpiresIn = typeof body.refreshExpiresIn === 'string' && EXPIRES_IN_PATTERN.test(body.refreshExpiresIn) ? body.refreshExpiresIn : undefined;
  if (!accessExpiresIn && !refreshExpiresIn) return {};
  const ttl: TokenTTL = { accessExpiresIn, refreshExpiresIn };
  const cookieMaxAge: { access?: number; refresh?: number } = {};
  if (accessExpiresIn) cookieMaxAge.access = parseExpiresInSeconds(accessExpiresIn)!;
  if (refreshExpiresIn) cookieMaxAge.refresh = parseExpiresInSeconds(refreshExpiresIn)!;
  return { ttl, cookieMaxAge };
}

export function createAuthController(authService: AuthService) {
  return {
    async register(req: Request, res: Response): Promise<void> {
      try {
        const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
          res.status(400).json({ error: 'Bad Request', message: 'Email and password required' });
          return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          });
          return;
        }
        const { ttl, cookieMaxAge } = extractDevTTL(req.body);
        const result = await authService.register(email.trim(), password, name?.trim(), ttl);
        setAuthCookies(res, result.accessToken, result.refreshToken, cookieMaxAge);
        res.status(201).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
          expiresIn: getAccessTokenExpiresInSeconds(ttl?.accessExpiresIn),
        });
      } catch (e) {
        if (e instanceof EmailTakenError) {
          res.status(409).json({ error: 'Conflict', message: e.message });
          return;
        }
        throw e;
      }
    },

    async login(req: Request, res: Response): Promise<void> {
      try {
        const { email, password } = req.body as { email?: string; password?: string };
        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
          res.status(400).json({ error: 'Bad Request', message: 'Email and password required' });
          return;
        }
        const { ttl, cookieMaxAge } = extractDevTTL(req.body);
        const result = await authService.login(email.trim(), password, ttl);
        setAuthCookies(res, result.accessToken, result.refreshToken, cookieMaxAge);
        res.status(200).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
          expiresIn: getAccessTokenExpiresInSeconds(ttl?.accessExpiresIn),
        });
      } catch (e) {
        if (e instanceof AuthError && e.code === 'INVALID_CREDENTIALS') {
          sendUnauthorized(res, 'Invalid email or password', Auth401Code.INVALID_CREDENTIALS);
          return;
        }
        throw e;
      }
    },

    async refresh(req: Request, res: Response): Promise<void> {
      try {
        const refreshToken = req.cookies?.[env.COOKIE_REFRESH_NAME];
        if (!refreshToken) {
          sendUnauthorized(res, 'Refresh token required', Auth401Code.REFRESH_TOKEN_MISSING);
          return;
        }
        const { ttl, cookieMaxAge } = extractDevTTL(req.body ?? {});
        const result = await authService.refresh(refreshToken, ttl);
        setAuthCookies(res, result.accessToken, result.refreshToken, cookieMaxAge);
        res.status(200).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
          expiresIn: getAccessTokenExpiresInSeconds(ttl?.accessExpiresIn),
        });
      } catch (e) {
        if (e instanceof AuthError) {
          if (e.code === 'REFRESH_CONCURRENT') {
            sendConflict(res, e.message, Auth409Code.REFRESH_CONCURRENT, 1);
            return;
          }
          sendUnauthorized(res, e.message, e.code);
          return;
        }
        throw e;
      }
    },

    async logout(req: Request, res: Response): Promise<void> {
      const refreshToken = req.cookies?.[env.COOKIE_REFRESH_NAME];
      await authService.logout(refreshToken);
      clearAuthCookies(res);
      res.status(204).send();
    },

    async me(req: Request, res: Response): Promise<void> {
      if (!req.user) {
        sendUnauthorized(res, 'Not authenticated', Auth401Code.ACCESS_TOKEN_INVALID);
        return;
      }
      res.status(200).json({
        user: { id: req.user.id, email: req.user.email, name: req.user.name, createdAt: req.user.createdAt },
      });
    },
  };
}
