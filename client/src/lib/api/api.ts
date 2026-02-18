import { AuthUser, AuthResponse } from '@/types/apiTypes';
import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ message?: string }>).response?.data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export const login = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const { data } = await axios.post<AuthUser>(
      `${API_URL}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
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
    const { data } = await axios.post<AuthResponse>(
      `${API_URL}/auth/register`,
      { email, password, name },
      { withCredentials: true }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

