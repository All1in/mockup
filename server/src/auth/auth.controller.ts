import type { Request, Response } from 'express';
import { AuthService, AuthError } from './auth.service';
import { setAuthCookies, clearAuthCookies } from './token.service';
import { env } from '../config/env';
import { sendUnauthorized, Auth401Code } from './auth.errors';

const MIN_PASSWORD_LENGTH = 8;

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
        const result = await authService.register(email.trim(), password, name?.trim());
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(201).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
        });
      } catch (e) {
        if (e instanceof AuthError && e.code === 'EMAIL_TAKEN') {
          res.status(409).json({ error: 'Conflict', message: 'User with this email already exists' });
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
        const result = await authService.login(email.trim(), password);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
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
        const result = await authService.refresh(refreshToken);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({
          user: { id: result.user.id, email: result.user.email, name: result.user.name, createdAt: result.user.createdAt },
        });
      } catch (e) {
        if (e instanceof AuthError) {
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
