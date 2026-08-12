'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/types/apiTypes';

interface PrivateRouteProps {
  children: ReactNode | ((user: AuthUser) => ReactNode);
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { data: user, isLoading, isError } = useAuth();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      window.location.replace('/sign-in');
    }
  }, [isLoading, isError, user]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  if (typeof children === 'function') {
    return <>{children(user)}</>;
  }

  return <>{children}</>;
}
