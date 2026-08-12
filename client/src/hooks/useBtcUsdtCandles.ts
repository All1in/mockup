import { useQuery } from '@tanstack/react-query';
import type { BtcCandlesResponse, BtcCandleInterval } from '@/types/dashboardTypes';
import { getBtcUsdtCandles } from '@/lib/api/api';

export function useBtcUsdtCandles(interval: BtcCandleInterval, limit = 200) {
  return useQuery<BtcCandlesResponse>({
    queryKey: ['btc-usdt-candles', interval, limit],
    queryFn: () => getBtcUsdtCandles(interval, limit),
    retry: 2,
    staleTime: 15_000,
  });
}
