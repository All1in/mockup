import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  User,
  AuthContextValue,
  AuthorizedUser,
  Login,
  Register,
} from '../models/auth';
import apiFetch from '../utility/requests';
import { ApiError } from '../utility/requests';

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

async function validateUser(): Promise<User | null> {
  try {
    const res = await apiFetch<{ user: User }>('auth/me', {
      method: 'GET',
    });

    return res.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    return null;
  }
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    validateUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const validatedUser = await validateUser();
        setUser(validatedUser);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (loginData: Login) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AuthorizedUser>('auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (regData: Register) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AuthorizedUser>('auth/register', {
        method: 'POST',
        body: JSON.stringify(regData),
      });

      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiFetch<void>('auth/logout', {
        method: 'POST',
      });
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
