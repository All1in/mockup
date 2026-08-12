import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

export type UseInnAvailabilityArgs = {
  getInn: (inn: string) => Promise<boolean>;
  debounceMs?: number;
};

export function useInnAvailabilityQuery({ getInn, debounceMs = 500 }: UseInnAvailabilityArgs) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<number | null>(null);

  const normalize = (v: string) => v.trim();

  const run = useCallback(
    async (raw: string) => {
      const inn = normalize(raw);
      if (!inn) return null;
      if (!(inn.length === 8 || inn.length === 10)) return null;

      setChecking(true);
      try {
        const valid = await qc.fetchQuery({
          queryKey: ['checkInn', inn],
          queryFn: () => getInn(inn),
          staleTime: 5 * 60 * 1000,
        });
        return valid;
      } finally {
        setChecking(false);
      }
    },
    [qc, getInn]
  );

  const onBlur = useCallback(
    async (raw: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return await run(raw);
    },
    [run]
  );

  const onChangeValue = useCallback(
    (raw: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void run(raw);
      }, debounceMs);
    },
    [debounceMs, run]
  );

  return { checking, onBlur, onChangeValue };
}

