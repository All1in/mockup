import { AuthUser, AuthResponse } from '@/types/apiTypes';
import { toApiError } from '@/utils/Error';
import axios from 'axios';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

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

export const register = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name });
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


