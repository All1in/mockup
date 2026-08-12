import express, { Router } from 'express';
import { createAuthMiddleware } from '../auth/auth.middleware';
import type { IUserRepository } from '../db/repositories';
import type { DisabledPaymentController, PaymentController } from './payment.controller';

type PaymentRouteController = PaymentController | DisabledPaymentController;

export function createPaymentRoutes(
  controller: PaymentRouteController,
  userRepo: IUserRepository
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(userRepo);

  router.get('/config', controller.getConfig.bind(controller));
  router.post('/intents', authMiddleware, controller.createPaymentIntent.bind(controller));
  router.get('/orders/:orderId', authMiddleware, controller.getOrder.bind(controller));

  return router;
}

export function createPaymentWebhookRoutes(controller: PaymentRouteController): Router {
  const router = Router();

  router.post(
    '/',
    express.raw({ type: 'application/json', limit: '2mb' }),
    controller.handleWebhook.bind(controller)
  );

  return router;
}
