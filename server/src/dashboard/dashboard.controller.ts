import type { Request, Response } from 'express';
import { createDashboardService } from './dashboard.service';

export function createDashboardController(service: ReturnType<typeof createDashboardService>) {
  function parseInterval(raw: unknown): '1m' | '5m' | '15m' | '1h' | '4h' | '1d' {
    if (raw === '1m' || raw === '5m' || raw === '15m' || raw === '1h' || raw === '4h' || raw === '1d') {
      return raw;
    }
    return '1h';
  }

  function parseLimit(raw: unknown): number {
    const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(parsed)) return 200;
    return Math.min(Math.max(Math.floor(parsed), 50), 500);
  }

  function parseActivityLimit(raw: unknown): number {
    const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(Math.max(Math.floor(parsed), 1), 200);
  }

  function parseActivityOffset(raw: unknown): number {
    const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.floor(parsed), 0);
  }

  function parseActivityQuery(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : undefined;
  }

  return {
    async overview(req: Request, res: Response): Promise<void> {
      const { chartRangeDays } = req.query;
      const rangeDaysNum = typeof chartRangeDays === 'string' ? Number(chartRangeDays) : undefined;
      // For now metrics/health are computed from latest points; chart is loaded via /chart.
      // Keeping query parsing here makes it easy to extend later.
      void rangeDaysNum;
      try {
        const data = await service.getOverview();
        res.status(200).json(data);
      } catch (err) {
        res.status(500).json({ error: 'Dashboard overview failed', message: err instanceof Error ? err.message : String(err) });
      }
    },

    async activity(req: Request, res: Response): Promise<void> {
      const limit = parseActivityLimit(req.query.limit);
      const offset = parseActivityOffset(req.query.offset);
      const q = parseActivityQuery(req.query.q);

      try {
        const data = await service.getActivity(limit, offset, q);
        res.status(200).json(data);
      } catch (err) {
        res.status(500).json({ error: 'Dashboard activity failed', message: err instanceof Error ? err.message : String(err) });
      }
    },

    async chart(req: Request, res: Response): Promise<void> {
      const interval = parseInterval(req.query.interval);
      const limit = parseLimit(req.query.limit);

      try {
        const data = await service.getBtcUsdtCandles(interval, limit);
        res.status(200).json(data);
      } catch (err) {
        res.status(500).json({ error: 'Dashboard chart failed', message: err instanceof Error ? err.message : String(err) });
      }
    },

    async usersByCountry(_req: Request, res: Response): Promise<void> {
      try {
        const data = await service.getUsersByCountry();
        res.status(200).json(data);
      } catch (err) {
        res.status(500).json({ error: 'Dashboard users by country failed', message: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}

