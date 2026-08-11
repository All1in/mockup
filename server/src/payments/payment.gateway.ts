import Stripe from 'stripe';
import type { StripeConfig } from 'stripe/cjs/lib';
import type { PaymentIntent } from 'stripe/cjs/resources/PaymentIntents';
import { env } from '../config/env';
import type {
  CreatePaymentIntentInput,
  PaymentErrorSnapshot,
  PaymentOrderStatus,
  PaymentProviderIntent,
} from './payment.entities';
import { PaymentError } from './payment.errors';

export interface PaymentProviderEvent {
  id: string;
  type: string;
  livemode: boolean;
  apiVersion?: string;
  paymentIntent?: PaymentProviderIntent;
}

export interface IPaymentProviderGateway {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentProviderIntent>;
  retrievePaymentIntent(paymentIntentId: string): Promise<PaymentProviderIntent>;
  constructWebhookEvent(rawBody: Buffer, signature: string): PaymentProviderEvent;
}

function toPaymentOrderStatus(status: PaymentIntent.Status): PaymentOrderStatus {
  return status;
}

function toPaymentErrorSnapshot(error?: PaymentIntent.LastPaymentError | null): PaymentErrorSnapshot | undefined {
  if (!error?.message) return undefined;
  return {
    code: error.code,
    message: error.message,
  };
}

function toProviderIntent(intent: PaymentIntent): PaymentProviderIntent {
  return {
    id: intent.id,
    clientSecret: intent.client_secret ?? null,
    status: toPaymentOrderStatus(intent.status),
    amount: intent.amount,
    currency: intent.currency,
    metadata: intent.metadata,
    lastError: toPaymentErrorSnapshot(intent.last_payment_error),
  };
}

export class StripePaymentGateway implements IPaymentProviderGateway {
  private readonly stripe: Stripe.Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
    apiVersion?: string
  ) {
    const config: StripeConfig = {
      maxNetworkRetries: 2,
    };

    if (apiVersion) {
      config.apiVersion = apiVersion as StripeConfig['apiVersion'];
    }

    this.stripe = new Stripe(secretKey, config);
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentProviderIntent> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: input.amount,
          currency: input.currency,
          automatic_payment_methods: { enabled: true },
          description: input.description,
          receipt_email: input.receiptEmail,
          metadata: input.metadata,
        },
        { idempotencyKey: input.idempotencyKey }
      );

      return toProviderIntent(intent);
    } catch (error) {
      throw new PaymentError('PAYMENT_PROVIDER_ERROR', 'Stripe PaymentIntent creation failed', error);
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentProviderIntent> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return toProviderIntent(intent);
    } catch (error) {
      throw new PaymentError('PAYMENT_PROVIDER_ERROR', 'Stripe PaymentIntent retrieval failed', error);
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): PaymentProviderEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      const object = event.data.object;

      return {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        apiVersion: event.api_version ?? undefined,
        paymentIntent: object.object === 'payment_intent'
          ? toProviderIntent(object as PaymentIntent)
          : undefined,
      };
    } catch (error) {
      throw new PaymentError('WEBHOOK_SIGNATURE_INVALID', 'Invalid Stripe webhook signature', error);
    }
  }
}

export function createStripePaymentGatewayFromEnv(): StripePaymentGateway | null {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }

  return new StripePaymentGateway(
    env.STRIPE_SECRET_KEY,
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_API_VERSION
  );
}
