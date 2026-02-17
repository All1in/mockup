import { Router } from 'express';
import { createAuthController } from './auth.controller';
import { createAuthMiddleware } from './auth.middleware';
import type { AuthService } from './auth.service';
import type { IUserRepository } from '../db/repositories';

export function createAuthRoutes(authService: AuthService, userRepo: IUserRepository): Router {
  const router = Router();
  const controller = createAuthController(authService);
  const authMiddleware = createAuthMiddleware(userRepo);

  router.post('/register', controller.register.bind(controller));
  router.post('/login', controller.login.bind(controller));
  router.post('/refresh', controller.refresh.bind(controller));
  router.post('/logout', controller.logout.bind(controller));
  router.get('/me', authMiddleware, controller.me.bind(controller));

  return router;
}
