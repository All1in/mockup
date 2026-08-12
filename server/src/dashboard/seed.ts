import { DashboardActivityModel, type DashboardActivityStatus } from './models/DashboardActivity.model';
import { DashboardChartPointModel } from './models/DashboardChartPoint.model';
import { DashboardCountryStatModel } from './models/DashboardCountryStat.model';
import { DashboardQuickActionModel } from './models/DashboardQuickAction.model';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pickWeighted<T>(rand: number, items: Array<{ value: T; w: number }>): T {
  const total = items.reduce((acc, i) => acc + i.w, 0);
  let r = rand * total;
  for (const item of items) {
    r -= item.w;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

function makeTime(d: Date, hours: number, minutes: number): Date {
  const copy = new Date(d);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

export async function seedDashboardDataIfNeeded(): Promise<void> {
  const TARGET_ACTIVITY_ITEMS = 5_000;

  const [chartCount, activityCount, quickActionsCount, countryStatsCount] = await Promise.all([
    DashboardChartPointModel.countDocuments(),
    DashboardActivityModel.countDocuments(),
    DashboardQuickActionModel.countDocuments(),
    DashboardCountryStatModel.countDocuments(),
  ]);

  // Seed chart points for the last ~60 days.
  if (chartCount === 0) {
    const rangeDays = 60;
    const rand = mulberry32(123456789);
    const today = new Date();

    const chartPoints: Array<{
      date: Date;
      activeUsers: number;
      revenueCents: number;
      usagePercent: number;
      uptimePercent: number;
      incidentRatePercent: number;
      avgLatencyMs: number;
    }> = [];

    const startActive = 820;
    const endActive = 1680;

    const startRevenueCents = 1_800_000; // $18k
    const endRevenueCents = 6_400_000; // $64k

    for (let i = 0; i < rangeDays; i += 1) {
      const t = i / (rangeDays - 1);
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (rangeDays - 1 - i));

      const activeNoise = (rand() - 0.5) * 90;
      const revenueNoise = (rand() - 0.5) * 220_000;
      const usageNoise = (rand() - 0.5) * 2.5;
      const incidentNoise = (rand() - 0.5) * 0.06;
      const latencyNoise = (rand() - 0.5) * 20;

      const activeUsers = Math.round(startActive + t * (endActive - startActive) + activeNoise);
      const revenueCents = Math.round(startRevenueCents + t * (endRevenueCents - startRevenueCents) + revenueNoise);
      const usagePercent = clamp(78 + t * (95 - 78) + usageNoise, 60, 99.5);

      // Lower incidents over time.
      const incidentRatePercent = clamp(0.52 - t * 0.40 + incidentNoise, 0.05, 0.85);

      // Higher uptime with lower incident rate.
      const uptimePercent = clamp(99.2 - incidentRatePercent * 0.7 + (rand() - 0.5) * 0.08, 98.8, 100);

      // Latency correlates slightly with incident rate.
      const avgLatencyMs = clamp(320 - t * 135 + incidentRatePercent * 180 + latencyNoise, 110, 420);

      chartPoints.push({
        date,
        activeUsers,
        revenueCents,
        usagePercent,
        uptimePercent,
        incidentRatePercent,
        avgLatencyMs,
      });
    }

    await DashboardChartPointModel.insertMany(chartPoints, { ordered: true });
    // eslint-disable-next-line no-console
    console.log(`Seed: dashboard chart data inserted (${chartPoints.length} chart points)`);
  }

  // Seed quick actions (few items, but still stored in MongoDB).
  if (quickActionsCount === 0) {
    const quickActions = [
      {
        title: 'Review account settings',
        description: 'Update profile and security preferences.',
        badgeLabel: 'Recommended',
        badgeColor: 'default' as const,
        badgeVariant: 'filled' as const,
        sortOrder: 1,
      },
      {
        title: 'Upload company document',
        description: 'If you registered as business, complete verification.',
        badgeLabel: 'Optional',
        badgeColor: 'default' as const,
        badgeVariant: 'outlined' as const,
        sortOrder: 2,
      },
      {
        title: 'Enable security checks',
        description: 'Turn on stronger validation for critical actions.',
        badgeLabel: 'High priority',
        badgeColor: 'success' as const,
        badgeVariant: 'filled' as const,
        sortOrder: 3,
      },
    ];

    await DashboardQuickActionModel.insertMany(quickActions, { ordered: true });
    // eslint-disable-next-line no-console
    console.log(`Seed: dashboard quick actions inserted (${quickActions.length})`);
  }

  // Ensure enough activity items for realistic dashboard load testing.
  // We only append missing rows and never delete existing data.
  if (activityCount < TARGET_ACTIVITY_ITEMS) {
    const titleByStatus: Record<DashboardActivityStatus, string[]> = {
      ok: ['Profile verified', 'New upload processed', 'Billing sync completed', 'Security scan passed'],
      warn: ['Upload pending review', 'Latency increased temporarily', 'Usage sync delayed', 'Moderation queue updated'],
      error: ['Action required', 'Document verification failed', 'Service degraded', 'Incident detected'],
    };

    const detailByStatus: Record<DashboardActivityStatus, string[]> = {
      ok: [
        'KYC checks completed automatically.',
        'Avatar stored and linked to account.',
        'Payment provider connection confirmed.',
        'Security validations passed all rules.',
      ],
      warn: [
        'Some fields require confirmation by admin.',
        'Processing delay observed; will auto-resolve.',
        'Background job is running behind schedule.',
        'Queue updated; next sync is pending.',
      ],
      error: [
        'Company document verification needs attention.',
        'A step failed; please retry or contact support.',
        'Service health dropped below threshold.',
        'Incident flags triggered; review required.',
      ],
    };

    const activityDocs: Array<{
      title: string;
      detail: string;
      status: DashboardActivityStatus;
      occurredAt: Date;
    }> = [];

    const rand = mulberry32(987654321 + activityCount);
    const today = new Date();

    const base = new Date(today);
    base.setHours(0, 0, 0, 0);

    while (activityDocs.length < TARGET_ACTIVITY_ITEMS - activityCount) {
      const daysBack = Math.floor(rand() * 365);
      const d = new Date(base);
      d.setDate(d.getDate() - daysBack);

      const eventsToday = 1 + Math.floor(rand() * 4); // 1..4 events batch
      for (let e = 0; e < eventsToday && activityDocs.length < TARGET_ACTIVITY_ITEMS - activityCount; e += 1) {
        const status = pickWeighted<DashboardActivityStatus>(rand(), [
          { value: 'ok', w: 0.7 },
          { value: 'warn', w: 0.2 },
          { value: 'error', w: 0.1 },
        ]);

        const titlePool = titleByStatus[status];
        const detailPool = detailByStatus[status];
        const title = titlePool[Math.floor(rand() * titlePool.length)]!;
        const detail = detailPool[Math.floor(rand() * detailPool.length)]!;

        const hours = Math.floor(rand() * 24);
        const minutes = Math.floor(rand() * 60);
        const occurredAt = makeTime(d, hours, minutes);

        activityDocs.push({ title, detail, status, occurredAt });
      }
    }

    await DashboardActivityModel.insertMany(activityDocs, { ordered: true });
    // eslint-disable-next-line no-console
    console.log(
      `Seed: dashboard activity inserted (${activityDocs.length} items, total target ${TARGET_ACTIVITY_ITEMS})`
    );
  }

  if (countryStatsCount === 0) {
    const countryStats = [
      { countryCode: 'IN', countryName: 'India', users: 49_250, sortOrder: 1 },
      { countryCode: 'US', countryName: 'USA', users: 34_475, sortOrder: 2 },
      { countryCode: 'BR', countryName: 'Brazil', users: 9_850, sortOrder: 3 },
      { countryCode: 'OT', countryName: 'Other', users: 4_925, sortOrder: 4 },
    ];
    await DashboardCountryStatModel.insertMany(countryStats, { ordered: true });
    // eslint-disable-next-line no-console
    console.log(`Seed: dashboard users-by-country inserted (${countryStats.length} items)`);
  }
}

