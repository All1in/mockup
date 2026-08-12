'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import AppTheme from '@/shared/shared-theme/AppTheme';
import { AUTH_INVALIDATE_EVENT } from '@/lib/auth/auth';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('@tanstack/react-query-devtools').then(m => m.ReactQueryDevtools),
      { ssr: false })
    : () => null;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

function AuthChannelSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };
    window.addEventListener(AUTH_INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(AUTH_INVALIDATE_EVENT, handler);
  }, [queryClient]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthChannelSync />
      <AppTheme>{children}</AppTheme>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
