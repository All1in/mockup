import mongoose from 'mongoose';

export type DashboardQuickActionBadgeColor = 'success' | 'error' | 'default';

export interface IDashboardQuickActionDoc extends mongoose.Document {
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: DashboardQuickActionBadgeColor;
  badgeVariant: 'outlined' | 'filled';
  sortOrder: number;
}

const dashboardQuickActionSchema = new mongoose.Schema<IDashboardQuickActionDoc>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    badgeLabel: { type: String, required: true },
    badgeColor: { type: String, required: true, enum: ['success', 'error', 'default'] },
    badgeVariant: { type: String, required: true, enum: ['outlined', 'filled'] },
    sortOrder: { type: Number, required: true, index: true },
  },
  { timestamps: false }
);

dashboardQuickActionSchema.index({ sortOrder: 1 });

export const DashboardQuickActionModel = mongoose.model<IDashboardQuickActionDoc>(
  'DashboardQuickAction',
  dashboardQuickActionSchema
);

