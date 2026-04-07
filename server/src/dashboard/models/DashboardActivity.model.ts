import mongoose from 'mongoose';

export type DashboardActivityStatus = 'ok' | 'warn' | 'error';

export interface IDashboardActivityDoc extends mongoose.Document {
  title: string;
  detail: string;
  status: DashboardActivityStatus;
  occurredAt: Date;
}

const dashboardActivitySchema = new mongoose.Schema<IDashboardActivityDoc>(
  {
    title: { type: String, required: true, index: true },
    detail: { type: String, required: true },
    status: { type: String, required: true, enum: ['ok', 'warn', 'error'] },
    occurredAt: { type: Date, required: true, index: true },
  },
  { timestamps: false }
);

dashboardActivitySchema.index({ occurredAt: -1 });

export const DashboardActivityModel = mongoose.model<IDashboardActivityDoc>(
  'DashboardActivity',
  dashboardActivitySchema
);

