import type { User } from '../db/entities';
import type {
  IPaymentEventRepository,
  IPaymentOrderRepository,
} from './payment.repositories';
import type {
  CreatePaymentOrderInput,
  PaymentOrder,
  PaymentProviderIntent,
} from './payment.entities';
import type {
  IPaymentProviderGateway,
  PaymentProviderEvent,
} from './payment.gateway';
import { PaymentError } from './payment.errors';

export interface CreatePaymentIntentCommand {
  user: User;
  amount: number;
  currency: CreatePaymentOrderInput['currency'];
  idempotencyKey: string;
  description?: string;
  metadata: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  order: PaymentOrder;
  clientSecret: string | null;
}

export interface WebhookProcessingResult {
  processed: boolean;
  eventId: string;
  type: string;
}

type Clock = () => Date;

export class PaymentService {
  constructor(
    private readonly orderRepo: IPaymentOrderRepository,
    private readonly eventRepo: IPaymentEventRepository,
    private readonly gateway: IPaymentProviderGateway,
    private readonly clock: Clock = () => new Date()
  ) {}

  async createPaymentIntent(command: CreatePaymentIntentCommand): Promise<CreatePaymentIntentResult> {
    const order = await this.getOrCreateOrder(command);
    this.assertIdempotencyKeyMatchesOrder(order, command);

    if (order.stripePaymentIntentId) {
      const providerIntent = await this.gateway.retrievePaymentIntent(order.stripePaymentIntentId);
      const syncedOrder = await this.syncOrderFromProviderIntent(order, providerIntent);
      return {
        order: syncedOrder,
        clientSecret: this.getReturnableClientSecret(providerIntent),
      };
    }

    const providerIntent = await this.gateway.createPaymentIntent({
      amount: command.amount,
      currency: command.currency,
      description: command.description,
      receiptEmail: command.user.email,
      metadata: {
        ...command.metadata,
        appOrderId: order.id,
        appUserId: command.user.id,
      },
      idempotencyKey: this.buildProviderIdempotencyKey(order),
    });

    const syncedOrder = await this.syncOrderFromProviderIntent(order, providerIntent);

    return {
      order: syncedOrder,
      clientSecret: this.getReturnableClientSecret(providerIntent),
    };
  }

  async getOrderForUser(orderId: string, userId: string): Promise<PaymentOrder> {
    const order = await this.orderRepo.findByIdForUser(orderId, userId);
    if (!order) {
      throw new PaymentError('PAYMENT_ORDER_NOT_FOUND', 'Payment order not found');
    }

    if (!order.stripePaymentIntentId || this.isTerminal(order)) {
      return order;
    }

    const providerIntent = await this.gateway.retrievePaymentIntent(order.stripePaymentIntentId);
    return this.syncOrderFromProviderIntent(order, providerIntent);
  }

  async processWebhookEvent(event: PaymentProviderEvent): Promise<WebhookProcessingResult> {
    const paymentIntentId = event.paymentIntent?.id;

    if (event.paymentIntent) {
      await this.applyWebhookPaymentIntent(event.paymentIntent);
    }

    const createdEvent = await this.eventRepo.createIfAbsent({
      stripeEventId: event.id,
      type: event.type,
      paymentIntentId,
      livemode: event.livemode,
      apiVersion: event.apiVersion,
    });

    if (!createdEvent) {
      return { processed: false, eventId: event.id, type: event.type };
    }

    return { processed: true, eventId: event.id, type: event.type };
  }

  private async getOrCreateOrder(command: CreatePaymentIntentCommand): Promise<PaymentOrder> {
    const existing = await this.orderRepo.findByUserAndIdempotencyKey(
      command.user.id,
      command.idempotencyKey
    );

    if (existing) return existing;

    try {
      return await this.orderRepo.create({
        userId: command.user.id,
        amount: command.amount,
        currency: command.currency,
        idempotencyKey: command.idempotencyKey,
        description: command.description,
        metadata: command.metadata,
      });
    } catch (error) {
      if (!this.orderRepo.isDuplicateKeyError(error)) throw error;

      const racedOrder = await this.orderRepo.findByUserAndIdempotencyKey(
        command.user.id,
        command.idempotencyKey
      );

      if (!racedOrder) throw error;
      return racedOrder;
    }
  }

  private assertIdempotencyKeyMatchesOrder(order: PaymentOrder, command: CreatePaymentIntentCommand): void {
    if (order.amount === command.amount && order.currency === command.currency) return;

    throw new PaymentError(
      'IDEMPOTENCY_KEY_CONFLICT',
      'This idempotency key was already used for a different payment request'
    );
  }

  private buildProviderIdempotencyKey(order: PaymentOrder): string {
    return `payment-intent:${order.userId}:${order.idempotencyKey}`;
  }

  private async syncOrderFromProviderIntent(
    order: PaymentOrder,
    providerIntent: PaymentProviderIntent
  ): Promise<PaymentOrder> {
    const now = this.clock();
    const updated = await this.orderRepo.updateById(order.id, {
      stripePaymentIntentId: providerIntent.id,
      status: providerIntent.status,
      lastError: providerIntent.lastError ?? null,
      paidAt: providerIntent.status === 'succeeded' ? (order.paidAt ?? now) : null,
      canceledAt: providerIntent.status === 'canceled' ? (order.canceledAt ?? now) : null,
    });

    return updated ?? order;
  }

  private async applyWebhookPaymentIntent(providerIntent: PaymentProviderIntent): Promise<void> {
    const metadataOrderId = providerIntent.metadata.appOrderId;
    const order = metadataOrderId
      ? await this.orderRepo.findById(metadataOrderId)
      : await this.orderRepo.findByStripePaymentIntentId(providerIntent.id);

    if (!order) {
      throw new PaymentError(
        'WEBHOOK_ORDER_NOT_FOUND',
        `No local payment order found for PaymentIntent ${providerIntent.id}`
      );
    }

    await this.syncOrderFromProviderIntent(order, providerIntent);
  }

  private getReturnableClientSecret(providerIntent: PaymentProviderIntent): string | null {
    if (providerIntent.status === 'succeeded' || providerIntent.status === 'canceled') {
      return null;
    }

    return providerIntent.clientSecret;
  }

  private isTerminal(order: PaymentOrder): boolean {
    return order.status === 'succeeded' || order.status === 'canceled';
  }
}
