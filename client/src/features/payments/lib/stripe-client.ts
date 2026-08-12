import { loadStripe, type Stripe } from '@stripe/stripe-js';

const stripePromiseByKey = new Map<string, Promise<Stripe | null>>();

export function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  const cached = stripePromiseByKey.get(publishableKey);
  if (cached) return cached;

  const promise = loadStripe(publishableKey);
  stripePromiseByKey.set(publishableKey, promise);
  return promise;
}

export function createCheckoutIdempotencyKey(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `checkout:${id}`;
}
