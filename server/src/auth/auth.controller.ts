import type { Request, Response } from 'express';
import { AuthService, AuthError } from './auth.service';
import { setAuthCookies, clearAuthCookies } from './token.service';
import { env } from '../config/env';

const MIN_PASSWORD_LENGTH = 8;

export function createAuthController(authService: AuthService) {
  return {
    async register(req: Request, res: Response): Promise<void> {
      try {
        const { email, password } = req.body as { email?: string; password?: string };
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
        const result = await authService.register(email.trim(), password);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(201).json({
          user: { id: result.user.id, email: result.user.email, createdAt: result.user.createdAt },
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
          user: { id: result.user.id, email: result.user.email, createdAt: result.user.createdAt },
        });
      } catch (e) {
        if (e instanceof AuthError && e.code === 'INVALID_CREDENTIALS') {
          res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
          return;
        }
        throw e;
      }
    },

    async refresh(req: Request, res: Response): Promise<void> {
      try {
        const refreshToken = req.cookies?.[env.COOKIE_REFRESH_NAME];
        if (!refreshToken) {
          res.status(401).json({ error: 'Unauthorized', message: 'Refresh token required' });
          return;
        }
        const result = await authService.refresh(refreshToken);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({
          user: { id: result.user.id, email: result.user.email, createdAt: result.user.createdAt },
        });
      } catch (e) {
        if (e instanceof AuthError) {
          res.status(401).json({ error: 'Unauthorized', message: e.message });
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
        res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
        return;
      }
      res.status(200).json({
        user: { id: req.user.id, email: req.user.email, createdAt: req.user.createdAt },
      });
    },
  };
}
