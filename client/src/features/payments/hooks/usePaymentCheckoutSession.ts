'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createPaymentIntent, getPaymentConfig } from '../api/payments.api';
import { createCheckoutIdempotencyKey } from '../lib/stripe-client';
import type { CreatePaymentIntentRequest } from '../lib/payment.types';

type CheckoutSessionParams = Omit<CreatePaymentIntentRequest, 'idempotencyKey'> & {
  metadata?: Record<string, string>;
};

export function usePaymentCheckoutSession(params: CheckoutSessionParams) {
  const idempotencyKeyRef = useRef<string>(createCheckoutIdempotencyKey());
  const abortControllerRef = useRef<AbortController | null>(null);

  const configQuery = useQuery({
    queryKey: ['payments', 'config'],
    queryFn: getPaymentConfig,
    retry: 1,
  });

  const payload = useMemo<CreatePaymentIntentRequest>(() => ({
    ...params,
    idempotencyKey: idempotencyKeyRef.current,
  }), [params]);

  const intentMutation = useMutation({
    mutationKey: ['payments', 'intent', idempotencyKeyRef.current],
    mutationFn: () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return createPaymentIntent(payload, controller.signal);
    },
  });

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    configQuery,
    intentMutation,
    idempotencyKey: idempotencyKeyRef.current,
  };
}
