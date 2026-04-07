import { AuthUser, AuthResponse, RegisterMultipartPayload, RegisterMultipartResponse } from '@/types/apiTypes';
import { toApiError } from '@/utils/Error';
import axios from 'axios';
import type {
  BtcCandlesResponse,
  BtcCandleInterval,
  DashboardActivityResponse,
  DashboardOverviewResponse,
  DashboardUsersByCountryResponse,
} from '@/types/dashboardTypes';

const apiBaseEnv = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
export const API_BASE = apiBaseEnv ? apiBaseEnv : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const authMe = async (): Promise<AuthUser> => {
  try {
    const { data } = await api.get<AuthResponse>('/auth/me');
    return data.user;
  } catch (error) {
    throw toApiError(error);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    throw toApiError(error);
  }
};

export const getEmail = async(email: string): Promise<boolean> => {
  try {
    const { data } = await api.get<{ available: boolean }>(`/api/check-email?email=${encodeURIComponent(email)}`)
    return data.available;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getInn = async (inn: string): Promise<boolean> => {
  try {
    const { data } = await api.get<{ valid: boolean }>(`/api/check-inn?inn=${encodeURIComponent(inn)}`);
    return data.valid;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  try {
    const { data } = await api.get<DashboardOverviewResponse>('/dashboard/overview');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getDashboardActivity = async (
  limit = 60,
  offset = 0,
  q?: string
): Promise<DashboardActivityResponse> => {
  try {
    const query = q?.trim();

    const { data } = await api.get<DashboardActivityResponse>('/dashboard/activity', {
      params: {
        limit,
        offset,
        ...(query ? { q: query } : {}),
      },
    });

    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getBtcUsdtCandles = async (
  interval: BtcCandleInterval = '1h',
  limit = 200
): Promise<BtcCandlesResponse> => {
  try {
    const { data } = await api.get<BtcCandlesResponse>('/dashboard/chart', {
      params: { interval, limit },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getDashboardUsersByCountry = async (): Promise<DashboardUsersByCountryResponse> => {
  try {
    const { data } = await api.get<DashboardUsersByCountryResponse>('/dashboard/users-by-country');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const registerMultipart = async (payload: RegisterMultipartPayload): Promise<RegisterMultipartResponse> => {
  try {
    const fd = new FormData();

    const fields: (keyof RegisterMultipartPayload)[] = [
      'firstName', 'lastName', 'email', 'password', 'confirmPassword',
      'accountType', 'birthDate', 'companyName', 'inn', 'avatar', 'companyDocument',
    ];

    fields.forEach(key => {
      const value = payload[key];
      if (value !== undefined && value !== null) fd.set(key, value);
    });

    const { data } = await api.post<RegisterMultipartResponse>('/api/register', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const { error: err, field } = error.response?.data ?? {};
      if (typeof err === 'string' && typeof field === 'string') {
        return { error: err, field } satisfies RegisterMultipartResponse;
      }
    }
    throw toApiError(error);
  }
};


