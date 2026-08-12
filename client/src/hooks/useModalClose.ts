'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useModalClose(fallbackPath: string = '/') {
  const router = useRouter();

  return useCallback(() => {
    const hasCsrHistory =
      typeof window !== 'undefined' &&
      window.history.state?.__NA === true;

    if (hasCsrHistory) {
      router.back();
    } else {
      router.replace(fallbackPath);
    }
  }, [router, fallbackPath]);
}