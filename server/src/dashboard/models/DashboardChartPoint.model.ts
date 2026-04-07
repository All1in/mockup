import mongoose from 'mongoose';

export interface IDashboardChartPointDoc extends mongoose.Document {
  /** Midnight UTC-ish date used as stable key for time series. */
  date: Date;
  activeUsers: number;
  revenueCents: number;
  usagePercent: number; // 0..100
  uptimePercent: number; // 0..100
  incidentRatePercent: number; // e.g. 0.2 = 0.2%
  avgLatencyMs: number; // ms
}

const dashboardChartPointSchema = new mongoose.Schema<IDashboardChartPointDoc>(
  {
    date: { type: Date, required: true, unique: true, index: true },
    activeUsers: { type: Number, required: true },
    revenueCents: { type: Number, required: true },
    usagePercent: { type: Number, required: true },
    uptimePercent: { type: Number, required: true },
    incidentRatePercent: { type: Number, required: true },
    avgLatencyMs: { type: Number, required: true },
  },
  { timestamps: false }
);

export const DashboardChartPointModel = mongoose.model<IDashboardChartPointDoc>(
  'DashboardChartPoint',
  dashboardChartPointSchema
);

