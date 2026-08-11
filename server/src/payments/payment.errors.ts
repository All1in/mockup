export type PaymentErrorCode =
  | 'PAYMENTS_NOT_CONFIGURED'
  | 'BAD_PAYMENT_REQUEST'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'PAYMENT_ORDER_NOT_FOUND'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_ORDER_NOT_FOUND';

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export function getPublicPaymentErrorStatus(error: PaymentError): number {
  switch (error.code) {
    case 'PAYMENTS_NOT_CONFIGURED':
      return 503;
    case 'BAD_PAYMENT_REQUEST':
      return 400;
    case 'IDEMPOTENCY_KEY_CONFLICT':
      return 409;
    case 'PAYMENT_ORDER_NOT_FOUND':
      return 404;
    case 'WEBHOOK_SIGNATURE_INVALID':
      return 400;
    case 'WEBHOOK_ORDER_NOT_FOUND':
      return 500;
    case 'PAYMENT_PROVIDER_ERROR':
    default:
      return 502;
  }
}
