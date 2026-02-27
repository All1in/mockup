import { AuthUser, AuthResponse } from '@/types/apiTypes';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ message?: string }>).response?.data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
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
    throw new Error(getErrorMessage(error));
  }
};

export const authMe = async (): Promise<AuthUser> => {
  try {
    const { data } = await api.get<AuthResponse>('/auth/me');
    return data.user;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};


