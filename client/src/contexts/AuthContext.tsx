import { createContext, useContext, useEffect, useState, useRef } from 'react';
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

type Props = {
  children: ReactNode;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx) {
    return ctx;
  } else {
    throw new Error('useAuth must be used within AuthProvider');
  }
};

async function validateUser(): Promise<User | null> {
  try {
    const res = await apiFetch<{ user: User }>('auth/me', {
      body: null,
      method: 'GET',
    });
    return res.user;
  } catch (err) {
    console.log(`Error on authing is ${err}`);
    if (err instanceof ApiError && err.status === 401) {
      try {
        const res = await apiFetch<AuthorizedUser>('auth/refresh', {
          body: null,
          method: 'POST',
        });

        return res.user;
      } catch (err) {
        console.log(`Error on refreshin is ${err}`);
        return null;
      }
    } else {
      console.log(`Error on refreshin is ${err}`);
      return null;
    }
  }
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshId = useRef<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    validateUser()
      .then((user) => {
        setUser(user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function sheduleRefresh(
    timerRef: React.RefObject<number | null>,
    delay: number,
  ) {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(
      async () => {
        try {
          const res = await apiFetch<AuthorizedUser>('auth/refresh', {
            body: null,
            method: 'POST',
          });
          sheduleRefresh(timerRef, res.expiresIn);
          setUser(res.user);
        } catch (err) {
          console.log(`Error on refreshin is ${err}`);
          timerRef.current = null;

          setUser(null);
          return null;
        }
      },
      (delay - 60) * 1000,
    );
  }
  const login = async (loginData: Login) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AuthorizedUser>('auth/login', {
        body: JSON.stringify(loginData),
        method: 'POST',
      });
      setUser(res.user);
      sheduleRefresh(refreshId, res.expiresIn);
    } catch (err: any) {
      console.log('Error while logging:', err);

      setUser(null);

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (regData: Register) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AuthorizedUser>('auth/register', {
        body: JSON.stringify(regData),
        method: 'POST',
      });

      setUser(res.user);
      sheduleRefresh(refreshId, res.expiresIn);
    } catch (err: any) {
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<void>('auth/logout', {
        method: 'POST',
      });
    } catch (err: any) {
      throw err;
    } finally {
      setUser(null);
      if (typeof refreshId.current === 'number') {
        clearTimeout(refreshId.current);
        refreshId.current = null;
      }
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
