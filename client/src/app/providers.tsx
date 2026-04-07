'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import AppTheme from '@/shared/shared-theme/AppTheme';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
       <AppTheme>{children}</AppTheme>
         {process.env.NODE_ENV === 'development' && (
         <ReactQueryDevtools initialIsOpen={false} />
       )}
    </QueryClientProvider>
  );
}
