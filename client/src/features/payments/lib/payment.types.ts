export type PaymentOrderStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'
  | 'creation_failed';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: 'usd' | 'eur' | 'uah';
  status: PaymentOrderStatus;
  description?: string;
  lastError?: {
    code?: string;
    message: string;
  };
  paidAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfigResponse {
  paymentsEnabled: boolean;
  publishableKey: string | null;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: PaymentOrder['currency'];
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  order: PaymentOrder;
  clientSecret: string | null;
  publishableKey: string;
}

export interface PaymentOrderResponse {
  order: PaymentOrder;
}
