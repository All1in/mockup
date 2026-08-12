import { Router } from 'express';
import type { IUserRepository } from '../db/repositories';
import { createAuthMiddleware } from '../auth/auth.middleware';
import { createDashboardService } from './dashboard.service';
import { createDashboardController } from './dashboard.controller';

export function createDashboardRoutes(userRepo: IUserRepository): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(userRepo);
  const service = createDashboardService();
  const controller = createDashboardController(service);

  router.get('/overview', authMiddleware, controller.overview.bind(controller));
  router.get('/activity', authMiddleware, controller.activity.bind(controller));
  router.get('/chart', authMiddleware, controller.chart.bind(controller));
  router.get('/users-by-country', authMiddleware, controller.usersByCountry.bind(controller));

  return router;
}

