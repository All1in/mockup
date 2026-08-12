export const SUPPORTED_PAYMENT_CURRENCIES = ['usd', 'eur', 'uah'] as const;

export type PaymentCurrency = (typeof SUPPORTED_PAYMENT_CURRENCIES)[number];

export type PaymentOrderStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'
  | 'creation_failed';

export interface PaymentErrorSnapshot {
  code?: string;
  message: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentOrderStatus;
  idempotencyKey: string;
  stripePaymentIntentId?: string;
  description?: string;
  metadata: Record<string, string>;
  lastError?: PaymentErrorSnapshot;
  paidAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentOrderInput {
  userId: string;
  amount: number;
  currency: PaymentCurrency;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface UpdatePaymentOrderInput {
  status?: PaymentOrderStatus;
  stripePaymentIntentId?: string;
  lastError?: PaymentErrorSnapshot | null;
  paidAt?: Date | null;
  canceledAt?: Date | null;
}

export interface PaymentProviderIntent {
  id: string;
  clientSecret: string | null;
  status: PaymentOrderStatus;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  lastError?: PaymentErrorSnapshot;
}

export interface CreatePaymentIntentInput {
  amount: number;
  currency: PaymentCurrency;
  description?: string;
  receiptEmail?: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface PaymentEventRecord {
  id: string;
  stripeEventId: string;
  type: string;
  paymentIntentId?: string;
  livemode: boolean;
  apiVersion?: string;
  processedAt: Date;
  createdAt: Date;
}

export interface CreatePaymentEventInput {
  stripeEventId: string;
  type: string;
  paymentIntentId?: string;
  livemode: boolean;
  apiVersion?: string;
}
