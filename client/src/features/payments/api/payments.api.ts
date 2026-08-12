import { api, API_BASE } from '@/lib/api/api';
import { toApiError } from '@/utils/Error';
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentConfigResponse,
  PaymentOrderResponse,
} from '../lib/payment.types';

function getBackendRootBaseUrl(): string {
  const normalized = API_BASE.replace(/\/+$/, '');
  if (normalized.endsWith('/api')) {
    return normalized.slice(0, -4) || '/';
  }
  return normalized || '/';
}

const PAYMENTS_API_BASE = getBackendRootBaseUrl();

export async function getPaymentConfig(): Promise<PaymentConfigResponse> {
  try {
    const { data } = await api.get<PaymentConfigResponse>('/payments/config', {
      baseURL: PAYMENTS_API_BASE,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentRequest,
  signal?: AbortSignal
): Promise<CreatePaymentIntentResponse> {
  try {
    const { data } = await api.post<CreatePaymentIntentResponse>('/payments/intents', payload, {
      baseURL: PAYMENTS_API_BASE,
      signal,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrderResponse> {
  try {
    const { data } = await api.get<PaymentOrderResponse>(`/payments/orders/${orderId}`, {
      baseURL: PAYMENTS_API_BASE,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
