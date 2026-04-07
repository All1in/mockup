'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/types/apiTypes';

interface PrivateRouteProps {
  children: ReactNode | ((user: AuthUser) => ReactNode);
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { data: user, isLoading, isError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      const callbackUrl = pathname && pathname !== '/sign-in' ? `?callbackUrl=${encodeURIComponent(pathname)}` : '';
      router.replace(`/sign-in${callbackUrl}`);
    }
  }, [isLoading, isError, user, router, pathname]);

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
