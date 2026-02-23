import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './token.service';
import type { IUserRepository } from '../db/repositories';
import { sendUnauthorized, Auth401Code } from './auth.errors';

export function createAuthMiddleware(userRepo: IUserRepository) {
  return async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.cookies?.access_token ?? (req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? null);
    if (!token) {
      sendUnauthorized(res, 'Access token required', Auth401Code.ACCESS_TOKEN_MISSING);
      return;
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      sendUnauthorized(res, 'Invalid or expired access token', Auth401Code.ACCESS_TOKEN_INVALID);
      return;
    }
    const user = await userRepo.findById(payload.sub);
    if (!user) {
      sendUnauthorized(res, 'User not found', Auth401Code.ACCESS_TOKEN_INVALID);
      return;
    }
    req.user = user;
    next();
  };
}
