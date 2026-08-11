import {
  SUPPORTED_PAYMENT_CURRENCIES,
  type PaymentCurrency,
} from './payment.entities';
import { PaymentError } from './payment.errors';

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_-]{12,128}$/;
const METADATA_KEY_PATTERN = /^[a-zA-Z0-9_:-]{1,40}$/;

export interface NormalizedCreatePaymentRequest {
  amount: number;
  currency: PaymentCurrency;
  idempotencyKey: string;
  description?: string;
  metadata: Record<string, string>;
}

export class PaymentRequestPolicy {
  private readonly supportedCurrencies = new Set<string>(SUPPORTED_PAYMENT_CURRENCIES);

  normalizeCreatePaymentRequest(body: Record<string, unknown>): NormalizedCreatePaymentRequest {
    const amount = this.normalizeAmount(body.amount);
    const currency = this.normalizeCurrency(body.currency);
    const idempotencyKey = this.normalizeIdempotencyKey(body.idempotencyKey);
    const description = this.normalizeDescription(body.description);
    const metadata = this.normalizeMetadata(body.metadata);

    return { amount, currency, idempotencyKey, description, metadata };
  }

  private normalizeAmount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 50 || value > 10_000_000) {
      throw new PaymentError(
        'BAD_PAYMENT_REQUEST',
        'Amount must be an integer in the smallest currency unit between 50 and 10000000'
      );
    }
    return value;
  }

  private normalizeCurrency(value: unknown): PaymentCurrency {
    if (typeof value !== 'string') {
      throw new PaymentError('BAD_PAYMENT_REQUEST', 'Currency is required');
    }

    const currency = value.trim().toLowerCase();
    if (!this.supportedCurrencies.has(currency)) {
      throw new PaymentError('BAD_PAYMENT_REQUEST', `Unsupported currency: ${value}`);
    }

    return currency as PaymentCurrency;
  }

  private normalizeIdempotencyKey(value: unknown): string {
    if (typeof value !== 'string') {
      throw new PaymentError('BAD_PAYMENT_REQUEST', 'Idempotency key is required');
    }

    const key = value.trim();
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new PaymentError(
        'BAD_PAYMENT_REQUEST',
        'Idempotency key must be 12-128 characters and contain only letters, numbers, colon, underscore, or dash'
      );
    }

    return key;
  }

  private normalizeDescription(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new PaymentError('BAD_PAYMENT_REQUEST', 'Description must be a string');
    }

    const description = value.trim();
    if (!description) return undefined;
    if (description.length > 200) {
      throw new PaymentError('BAD_PAYMENT_REQUEST', 'Description must be at most 200 characters');
    }

    return description;
  }

  private normalizeMetadata(value: unknown): Record<string, string> {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new PaymentError('BAD_PAYMENT_REQUEST', 'Metadata must be an object');
    }

    const result: Record<string, string> = {};
    for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
      if (!METADATA_KEY_PATTERN.test(key)) {
        throw new PaymentError('BAD_PAYMENT_REQUEST', `Invalid metadata key: ${key}`);
      }
      if (typeof rawValue !== 'string') {
        throw new PaymentError('BAD_PAYMENT_REQUEST', `Metadata value for ${key} must be a string`);
      }
      if (rawValue.length > 100) {
        throw new PaymentError('BAD_PAYMENT_REQUEST', `Metadata value for ${key} is too long`);
      }
      result[key] = rawValue;
    }

    return result;
  }
}
