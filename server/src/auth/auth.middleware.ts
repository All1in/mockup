import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './token.service';
import type { IUserRepository } from '../db/repositories';

export function createAuthMiddleware(userRepo: IUserRepository) {
  return async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.cookies?.access_token ?? (req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? null);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized', message: 'Access token required' });
      return;
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired access token' });
      return;
    }
    const user = await userRepo.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
      return;
    }
    req.user = user;
    next();
  };
}
