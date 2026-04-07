'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTheme } from '@mui/material/styles';
import type { BtcCandleInterval } from '@/types/dashboardTypes';
import { useBtcUsdtCandles } from '@/hooks/useBtcUsdtCandles';
import type { CandlestickData, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { BinanceKlinePayload, BinanceTradePayload } from '@/types/chartTypes';
import { fmtPrice } from '@/utils/helperFunctions';
import { useResilientWebSocket, WsStatus } from '@/hooks/useResilientWebSocket';



const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

const WS_STATUS_META: Record<WsStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  connecting:   { label: 'Connecting…',   color: 'warning' },
  open:         { label: 'Live',           color: 'success' },
  reconnecting: { label: 'Reconnecting…', color: 'warning' },
  closed:       { label: 'Disconnected',  color: 'error'   },
};

const LivePrice = memo(function LivePrice({ latestPrice }: { latestPrice: number | null }) {
  return (
    <Typography variant="h4" sx={{ fontWeight: 700 }}>
      {typeof latestPrice === 'number' ? fmtPrice(latestPrice) : '—'}
    </Typography>
  );
});

type LivePriceTickerProps = {
  enabled: boolean;
  initialPrice: number | null;
};

const LivePriceTicker = memo(function LivePriceTicker({
  enabled,
  initialPrice,
}: LivePriceTickerProps) {
  const [latestPrice, setLatestPrice] = useState<number | null>(initialPrice);
  const latestPriceRef = useRef<number | null>(initialPrice);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestPriceRef.current === null && typeof initialPrice === 'number') {
      latestPriceRef.current = initialPrice;
      setLatestPrice(initialPrice);
    }
  }, [initialPrice]);

  const flushLatestPrice = useCallback(() => {
    rafRef.current = null;
    setLatestPrice(latestPriceRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const tradeUrl = enabled ? `${BINANCE_WS_BASE}/btcusdt@trade` : null;

  const handleTradeMessage = useCallback((data: unknown) => {
    if (!enabled) return;
    const payload = data as BinanceTradePayload;
    const price = Number(payload?.p);
    if (!Number.isFinite(price)) return;

    latestPriceRef.current = price;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushLatestPrice);
    }
  }, [enabled, flushLatestPrice]);

  const tradeWsOptions = useMemo(
    () => ({
      onMessage: handleTradeMessage,
      heartbeatTimeoutMs: 5_000,
      baseDelayMs: 500,
      maxDelayMs: 30_000,
    }),
    [handleTradeMessage]
  );

  useResilientWebSocket(tradeUrl, tradeWsOptions);

  return <LivePrice latestPrice={latestPrice} />;
});

type IntervalSelectorProps = {
  candleInterval: BtcCandleInterval;
  onChange: (_: React.MouseEvent<HTMLElement>, next: BtcCandleInterval | null) => void;
};

const IntervalSelector = memo(function IntervalSelector({ candleInterval, onChange }: IntervalSelectorProps) {
  return (
    <ToggleButtonGroup
      size="small"
      color="primary"
      value={candleInterval}
      exclusive
      onChange={onChange}
    >
      <ToggleButton value="1m">1m</ToggleButton>
      <ToggleButton value="5m">5m</ToggleButton>
      <ToggleButton value="15m">15m</ToggleButton>
      <ToggleButton value="1h">1h</ToggleButton>
      <ToggleButton value="4h">4h</ToggleButton>
      <ToggleButton value="1d">1d</ToggleButton>
    </ToggleButtonGroup>
  );
});

const BtcUsdtChart = () => {
  const theme = useTheme();

  const [candleInterval, setCandleInterval] = useState<BtcCandleInterval>('1h');
  const [chartReady, setChartReady] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

  const activeIntervalRef = useRef<BtcCandleInterval>(candleInterval);
  useEffect(() => { activeIntervalRef.current = candleInterval; }, [candleInterval]);

  const {
    data,
    isLoading: chartLoading,
    isError: chartError,
    error: chartErr,
  } = useBtcUsdtCandles(candleInterval, 1500);

  const chartErrorMsg =
      chartErr instanceof Error && chartErr.message
          ? chartErr.message
          : 'Failed to load BTC/USDT candles';

  const candles = data?.candles ?? [];
  const latestCandleClose = candles[candles.length - 1]?.close ?? null;

  const chartData = useMemo(
      () =>
          candles
              .map((candle) => {
                const time  = Number(candle.time);
                const open  = Number(candle.open);
                const high  = Number(candle.high);
                const low   = Number(candle.low);
                const close = Number(candle.close);

                if (
                    !Number.isFinite(time)  ||
                    !Number.isFinite(open)  ||
                    !Number.isFinite(high)  ||
                    !Number.isFinite(low)   ||
                    !Number.isFinite(close)
                ) return null;

                return {
                  time: Math.floor(time) as UTCTimestamp,
                  open, high, low, close,
                } satisfies CandlestickData<UTCTimestamp>;
              })
              .filter((c): c is CandlestickData<UTCTimestamp> => c !== null)
              .sort((a, b) => Number(a.time) - Number(b.time)),
      [candles],
  );

  const containerRef    = useRef<HTMLDivElement | null>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      if (!containerRef.current || chartRef.current) return;
      const { createChart, CandlestickSeries } = await import('lightweight-charts');
      if (!containerRef.current || disposed) return;

      const chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background:  { color: 'transparent' },
          textColor:   theme.palette.text.secondary,
        },
        grid: {
          vertLines: { color: theme.palette.divider },
          horzLines: { color: theme.palette.divider },
        },
        rightPriceScale: { borderColor: theme.palette.divider },
        timeScale: {
          borderColor:    theme.palette.divider,
          timeVisible:    true,
          secondsVisible: false,
        },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor:      theme.palette.success.main,
        downColor:    theme.palette.error.main,
        borderVisible: false,
        wickUpColor:   theme.palette.success.main,
        wickDownColor: theme.palette.error.main,
      });

      chartRef.current        = chart;
      candleSeriesRef.current = candleSeries;
      setChartReady(true);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !chartRef.current) return;
        chartRef.current.applyOptions({
          width:  Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      });
      resizeObserver.observe(containerRef.current);
    };

    setup();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current        = null;
        candleSeriesRef.current = null;
        setChartReady(false);
      }
    };
  }, [
    theme.palette.divider,
    theme.palette.error.main,
    theme.palette.success.main,
    theme.palette.text.secondary,
  ]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    if (data?.interval !== candleInterval) return;

    candleSeriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [chartData, data?.interval, candleInterval]);

  const klineUrl = chartReady
      ? `${BINANCE_WS_BASE}/btcusdt@kline_${candleInterval}`
      : null;

  const socketIntervalRef = useRef<BtcCandleInterval>(candleInterval);
  useEffect(() => { socketIntervalRef.current = candleInterval; }, [candleInterval]);

  const handleKlineMessage = useCallback((data: unknown) => {
    if (socketIntervalRef.current !== activeIntervalRef.current) return;

    const payload = data as BinanceKlinePayload;
    const kline = payload?.k;
    if (!kline) return;

    const timeSec = Number(kline.t);
    const open    = Number(kline.o);
    const high    = Number(kline.h);
    const low     = Number(kline.l);
    const close   = Number(kline.c);

    if (
        !Number.isFinite(timeSec) ||
        !Number.isFinite(open)    ||
        !Number.isFinite(high)    ||
        !Number.isFinite(low)     ||
        !Number.isFinite(close)
    ) return;

    candleSeriesRef.current?.update({
      time: Math.floor(timeSec / 1000) as UTCTimestamp,
      open, high, low, close,
    });
  }, []);
  const handleKlineGiveUp = useCallback(() => {
    console.error('[KLINE WS] Exhausted all retries. Manual refresh required.');
  }, []);

  const klineWsOptions = useMemo(
    () => ({
      onMessage: handleKlineMessage,
      onStatusChange: setWsStatus,
      onGiveUp: handleKlineGiveUp,
      baseDelayMs: 500,
      maxDelayMs: 30_000,
      jitter: 0.3,
      maxRetries: Infinity,
      heartbeatTimeoutMs: 15_000,
    }),
    [handleKlineGiveUp, handleKlineMessage]
  );

  useResilientWebSocket(klineUrl, klineWsOptions);

  const handleIntervalChange = useCallback((
      _: React.MouseEvent<HTMLElement>,
      next: BtcCandleInterval | null,
  ) => {
    if (!next) return;
    setCandleInterval(next);
  }, []);

  const statusMeta = WS_STATUS_META[wsStatus];

  return (
      <Card>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              BTC/USDT candlestick chart
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Live / reconnecting / disconnected indicator */}
              <Chip
                  label={statusMeta.label}
                  color={statusMeta.color}
                  size="small"
                  variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                Binance market data
              </Typography>
            </Box>
          </Box>

          {/* Price + interval selector row */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <LivePriceTicker
              enabled={chartReady}
              initialPrice={typeof latestCandleClose === 'number' ? latestCandleClose : null}
            />
            <IntervalSelector candleInterval={candleInterval} onChange={handleIntervalChange} />
          </Box>

          <Box sx={{ minHeight: 8 }}>
            {chartLoading ? <LinearProgress /> : null}
          </Box>

          {/* Chart container */}
          <Box sx={{ position: 'relative', width: '100%', height: 320, minHeight: 320 }}>
            {chartLoading ? (
              <Skeleton variant="rectangular" width="100%" height="100%" />
            ) : null}

            <Box
                ref={containerRef}
                sx={{
                  width: '100%',
                  height: '100%',
                  visibility: chartLoading || chartError || candles.length === 0 ? 'hidden' : 'visible',
                  position: chartLoading ? 'absolute' : 'relative',
                  inset: chartLoading ? 0 : 'auto',
                }}
            />

            {!chartLoading && (chartError || candles.length === 0) ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color={chartError ? 'error' : 'text.secondary'}>
                  {chartError ? chartErrorMsg : 'No BTC/USDT candle data available.'}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Card>
  );
};

export default memo(BtcUsdtChart);