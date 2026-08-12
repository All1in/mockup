export type DashboardMetricChipColor = 'success' | 'error' | 'default';

export type DashboardMetricIconKey = 'users' | 'revenue' | 'security' | 'usage';

export type DashboardQuickActionBadgeVariant = 'outlined' | 'filled';

export interface DashboardMetric {
  title: string;
  value: string;
  changeLabel: string;
  chipColor: DashboardMetricChipColor;
  iconKey: DashboardMetricIconKey;
}

export interface DashboardSystemHealth {
  uptimePercent: number;
  incidentRatePercent: number;
  avgLatencyMs: number;
}

export interface DashboardQuickAction {
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: DashboardMetricChipColor;
  badgeVariant: DashboardQuickActionBadgeVariant;
}

export interface DashboardOverviewResponse {
  metrics: DashboardMetric[];
  systemHealth: DashboardSystemHealth;
  quickActions: DashboardQuickAction[];
}

export type DashboardActivityStatus = 'ok' | 'warn' | 'error';

export interface DashboardActivityItem {
  id: string;
  title: string;
  detail: string;
  status: DashboardActivityStatus;
  whenLabel: string;
}


export type DashboardActivityResponse = {
  items: DashboardActivityItem[];
  total: number;
  limit?: number;
  offset?: number;
};

export type DashboardUsersByCountryItem = {
  countryCode: string;
  countryName: string;
  users: number;
  percent: number;
};

export type DashboardUsersByCountryResponse = {
  totalUsers: number;
  items: DashboardUsersByCountryItem[];
};

export type BtcCandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type CandlePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type BtcCandlesResponse = {
  symbol: 'BTCUSDT';
  interval: BtcCandleInterval;
  candles: CandlePoint[];
};