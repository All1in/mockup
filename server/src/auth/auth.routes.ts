import { Router } from 'express';
import { createAuthController } from './auth.controller';
import { createAuthMiddleware } from './auth.middleware';
import { createOAuthController } from './oauth.controller';
import type { AuthService } from './auth.service';
import type {
  IUserRepository,
  IRefreshTokenRepository,
  IProviderAccountRepository,
} from '../db/repositories';

export function createAuthRoutes(
  authService: AuthService,
  userRepo: IUserRepository,
  refreshTokenRepo: IRefreshTokenRepository,
  providerAccountRepo: IProviderAccountRepository
): Router {
  const router = Router();
  const controller = createAuthController(authService);
  const oauthController = createOAuthController(userRepo, refreshTokenRepo, providerAccountRepo);
  const authMiddleware = createAuthMiddleware(userRepo);

  router.post('/register', controller.register.bind(controller));
  router.post('/login', controller.login.bind(controller));
  router.post('/refresh', controller.refresh.bind(controller));
  router.post('/logout', controller.logout.bind(controller));
  router.get('/me', authMiddleware, controller.me.bind(controller));

  router.get('/:provider(google|facebook)', oauthController.redirectToProvider.bind(oauthController));
  router.get('/:provider(google|facebook)/callback', oauthController.handleCallback.bind(oauthController));
  router.post('/social', oauthController.verifyTokenAndLogin.bind(oauthController));

  return router;
}
