import { DashboardActivityModel } from './models/DashboardActivity.model';
import { DashboardChartPointModel } from './models/DashboardChartPoint.model';
import { DashboardCountryStatModel } from './models/DashboardCountryStat.model';
import { DashboardQuickActionModel } from './models/DashboardQuickAction.model';
import type {
  BtcCandlesResponse,
  BtcCandleInterval,
  CandlePoint,
  DashboardActivityResponse,
  DashboardMetric,
  DashboardOverviewResponse,
  DashboardQuickAction,
  DashboardUsersByCountryResponse,
} from './dashboard.types';

function fmtInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmtRevenueFromCents(revenueCents: number): string {
  const dollars = revenueCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(dollars);
}

function fmtPercent(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

function timeLabel(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function whenLabel(d: Date): string {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfThatDay = new Date(d);
  startOfThatDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((startOfThatDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return `Today, ${timeLabel(d)}`;
  if (diffDays === -1) return `Yesterday, ${timeLabel(d)}`;

  return `${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}, ${timeLabel(d)}`;
}

function deltaToChipLabel(deltaPct: number): {
  changeLabel: string;
  chipColor: 'success' | 'error' | 'default';
} {
  const abs = Math.abs(deltaPct);
  if (abs < 0.25) return { changeLabel: 'Stable', chipColor: 'default' };
  const sign = deltaPct >= 0 ? '+' : '';
  const chipColor: 'success' | 'error' | 'default' = deltaPct >= 0 ? 'success' : 'error';
  return { changeLabel: `${sign}${deltaPct.toFixed(1)}%`, chipColor };
}

export function createDashboardService() {
  const binanceBaseUrl = 'https://api.binance.com';
  const BTC_SYMBOL = 'BTCUSDT' as const;

  async function fetchBinanceJson<T>(pathWithQuery: string): Promise<T> {
    const response = await fetch(`${binanceBaseUrl}${pathWithQuery}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Binance request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  return {
    async getOverview(): Promise<DashboardOverviewResponse> {
      const [latest, previous] = await DashboardChartPointModel.find()
        .sort({ date: -1 })
        .limit(2)
        .lean();

      const nowPoint = latest;
      const prevPoint = previous ?? latest;

      if (!nowPoint) {
        return { metrics: [], systemHealth: { uptimePercent: 0, incidentRatePercent: 0, avgLatencyMs: 0 }, quickActions: [] };
      }

      const activeUsersDeltaPct =
        prevPoint && prevPoint.activeUsers > 0
          ? ((nowPoint.activeUsers - prevPoint.activeUsers) / prevPoint.activeUsers) * 100
          : 0;
      const revenueDeltaPct =
        prevPoint && prevPoint.revenueCents > 0
          ? ((nowPoint.revenueCents - prevPoint.revenueCents) / prevPoint.revenueCents) * 100
          : 0;
      const usageDeltaPct =
        prevPoint && prevPoint.usagePercent > 0
          ? ((nowPoint.usagePercent - prevPoint.usagePercent) / prevPoint.usagePercent) * 100
          : 0;

      const incidentDelta = nowPoint.incidentRatePercent - (prevPoint?.incidentRatePercent ?? nowPoint.incidentRatePercent);
      const securityDeltaColor: 'success' | 'error' | 'default' =
        Math.abs(incidentDelta) < 0.02 ? 'default' : incidentDelta <= 0 ? 'success' : 'error';
      const securityDeltaLabel =
        Math.abs(incidentDelta) < 0.02
          ? 'Stable'
          : `${incidentDelta <= 0 ? '-' : '+'}${Math.abs(incidentDelta).toFixed(2)}pp incidents`;

      const securityValue =
        nowPoint.incidentRatePercent <= 0.18
          ? 'Healthy'
          : nowPoint.incidentRatePercent <= 0.35
            ? 'Monitoring'
            : 'At risk';

      const metrics: DashboardMetric[] = [
        {
          title: 'Active users',
          value: fmtInt(nowPoint.activeUsers),
          ...deltaToChipLabel(activeUsersDeltaPct),
          iconKey: 'users',
        },
        {
          title: 'Revenue',
          value: fmtRevenueFromCents(nowPoint.revenueCents),
          ...deltaToChipLabel(revenueDeltaPct),
          iconKey: 'revenue',
        },
        {
          title: 'Security',
          value: securityValue,
          changeLabel: securityDeltaLabel,
          chipColor: securityDeltaColor,
          iconKey: 'security',
        },
        {
          title: 'Usage',
          value: `${nowPoint.usagePercent.toFixed(0)}%`,
          ...deltaToChipLabel(usageDeltaPct),
          iconKey: 'usage',
        },
      ];

      const systemHealth = {
        uptimePercent: nowPoint.uptimePercent,
        incidentRatePercent: nowPoint.incidentRatePercent,
        avgLatencyMs: nowPoint.avgLatencyMs,
      };

      const quickActionsDocs = await DashboardQuickActionModel.find()
        .sort({ sortOrder: 1 })
        .limit(5)
        .lean();

      const quickActions: DashboardQuickAction[] = (quickActionsDocs ?? []).map((qa) => ({
        title: qa.title,
        description: qa.description,
        badgeLabel: qa.badgeLabel,
        badgeColor: qa.badgeColor,
        badgeVariant: qa.badgeVariant,
      }));

      return { metrics, systemHealth, quickActions };
    },

    async getActivity(limit: number, offset: number, q?: string): Promise<DashboardActivityResponse> {
      const safeLimit = Math.min(Math.max(limit, 1), 200);
      const safeOffset = Math.max(offset, 0);
      const normalizedQuery = q?.trim();
      const hasQuery = Boolean(normalizedQuery);
      const filter = hasQuery
        ? {
            $or: [
              { title: { $regex: escapeRegExp(normalizedQuery as string), $options: 'i' } },
              { detail: { $regex: escapeRegExp(normalizedQuery as string), $options: 'i' } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        DashboardActivityModel.find(filter)
          .sort({ occurredAt: -1 })
          .skip(safeOffset)
          .limit(safeLimit)
          .lean(),
        DashboardActivityModel.countDocuments(filter),
      ]);

      return {
        items: (items ?? []).map((doc) => ({
          id: String(doc._id),
          title: doc.title,
          detail: doc.detail,
          status: doc.status,
          whenLabel: whenLabel(doc.occurredAt),
        })),
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    },

    async getBtcUsdtCandles(interval: BtcCandleInterval, limit: number): Promise<BtcCandlesResponse> {
      const safeLimit = Math.min(Math.max(limit, 50), 500);
      const payload = await fetchBinanceJson<unknown>(
        `/api/v3/klines?symbol=${BTC_SYMBOL}&interval=${interval}&limit=${safeLimit}`
      );
      if (!Array.isArray(payload)) {
        throw new Error('Unexpected Binance payload');
      }

      const candles: CandlePoint[] = payload
        .map((row) => {
          if (!Array.isArray(row) || row.length < 5) return null;
          const openTimeMs = Number(row[0]);
          const open = Number(row[1]);
          const high = Number(row[2]);
          const low = Number(row[3]);
          const close = Number(row[4]);
          if (!Number.isFinite(openTimeMs) || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
            return null;
          }
          return {
            time: Math.floor(openTimeMs / 1000),
            open,
            high,
            low,
            close,
          };
        })
        .filter((candle): candle is CandlePoint => candle !== null);

      return {
        symbol: BTC_SYMBOL,
        interval,
        candles,
      }
    },

    async getUsersByCountry(): Promise<DashboardUsersByCountryResponse> {
      const docs = await DashboardCountryStatModel.find()
        .sort({ sortOrder: 1, countryCode: 1 })
        .lean();

      const totalUsers = (docs ?? []).reduce((acc, doc) => acc + doc.users, 0);

      if (!totalUsers) {
        return { totalUsers: 0, items: [] };
      }

      return {
        totalUsers,
        items: docs.map((doc) => ({
          countryCode: doc.countryCode,
          countryName: doc.countryName,
          users: doc.users,
          percent: Number(((doc.users / totalUsers) * 100).toFixed(1)),
        })),
      };
    },
  };
}

