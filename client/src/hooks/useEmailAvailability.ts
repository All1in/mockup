import { UseEmailAvailabilityArgs } from '@/types/formTypes';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';


export function useEmailAvailabilityQuery({ getEmail, debounceMs = 500 }: UseEmailAvailabilityArgs) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<number | null>(null);

  const normalize = (v: string) => v.trim().toLowerCase();

  const run = useCallback(async (raw: string) => {
    const email = normalize(raw);
    if (!email) return null;

    setChecking(true);
    try {
      const available = await qc.fetchQuery({
        queryKey: ['checkEmail', email],
        queryFn: () => getEmail(email),
        staleTime: 5 * 60 * 1000, 
      });
      return available;
    } finally {
      setChecking(false);
    }
  }, [qc, getEmail]);

  const onBlur = useCallback(async (raw: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    return await run(raw);
  }, [run]);

  const onChangeValue = useCallback((raw: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { void run(raw); }, debounceMs);
  }, [debounceMs, run]);

  return { checking, onBlur, onChangeValue };
}