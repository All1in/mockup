import type { Request, Response } from 'express';
import { env } from '../config/env';
import type { PaymentService } from './payment.service';
import { PaymentRequestPolicy } from './payment.policy';
import { getPublicPaymentErrorStatus, PaymentError } from './payment.errors';
import type { IPaymentProviderGateway } from './payment.gateway';
import type { PaymentOrder } from './payment.entities';

function toPublicOrder(order: PaymentOrder) {
  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    description: order.description,
    lastError: order.lastError,
    paidAt: order.paidAt,
    canceledAt: order.canceledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function sendPaymentError(res: Response, error: PaymentError): void {
  res.status(getPublicPaymentErrorStatus(error)).json({
    error: error.code,
    message: error.message,
  });
}

export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly gateway: IPaymentProviderGateway,
    private readonly requestPolicy: PaymentRequestPolicy = new PaymentRequestPolicy()
  ) {}

  getConfig(_req: Request, res: Response): void {
    res.status(200).json({
      paymentsEnabled: true,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    });
  }

  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      const body = this.requestPolicy.normalizeCreatePaymentRequest(req.body ?? {});
      const result = await this.paymentService.createPaymentIntent({
        user: req.user,
        amount: body.amount,
        currency: body.currency,
        idempotencyKey: body.idempotencyKey,
        description: body.description,
        metadata: body.metadata,
      });

      res.status(201).json({
        order: toPublicOrder(result.order),
        clientSecret: result.clientSecret,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        sendPaymentError(res, error);
        return;
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Payment creation failed' });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      const orderId = req.params.orderId;
      const order = await this.paymentService.getOrderForUser(orderId, req.user.id);
      res.status(200).json({ order: toPublicOrder(order) });
    } catch (error) {
      if (error instanceof PaymentError) {
        sendPaymentError(res, error);
        return;
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Payment order lookup failed' });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        sendPaymentError(
          res,
          new PaymentError('WEBHOOK_SIGNATURE_INVALID', 'Missing Stripe webhook signature')
        );
        return;
      }

      if (!Buffer.isBuffer(req.body)) {
        sendPaymentError(
          res,
          new PaymentError('WEBHOOK_SIGNATURE_INVALID', 'Stripe webhook must use raw request body')
        );
        return;
      }

      const event = this.gateway.constructWebhookEvent(req.body, signature);
      const result = await this.paymentService.processWebhookEvent(event);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        sendPaymentError(res, error);
        return;
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Webhook processing failed' });
    }
  }
}

export class DisabledPaymentController {
  getConfig(_req: Request, res: Response): void {
    res.status(200).json({
      paymentsEnabled: false,
      publishableKey: null,
    });
  }

  createPaymentIntent(_req: Request, res: Response): void {
    sendPaymentError(
      res,
      new PaymentError('PAYMENTS_NOT_CONFIGURED', 'Stripe payments are not configured')
    );
  }

  getOrder(_req: Request, res: Response): void {
    sendPaymentError(
      res,
      new PaymentError('PAYMENTS_NOT_CONFIGURED', 'Stripe payments are not configured')
    );
  }

  handleWebhook(_req: Request, res: Response): void {
    sendPaymentError(
      res,
      new PaymentError('PAYMENTS_NOT_CONFIGURED', 'Stripe payments are not configured')
    );
  }
}
