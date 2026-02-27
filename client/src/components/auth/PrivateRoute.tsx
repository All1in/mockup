'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface PrivateRouteProps {
  children: ReactNode;
}

/**
 * Guard for protected routes: shows loader while session is checked,
 * redirects to sign-in with return URL when user is not authenticated.
 */
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

  return <>{children}</>;
}
