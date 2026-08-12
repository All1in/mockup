import mongoose from 'mongoose';

export interface IDashboardCountryStatDoc extends mongoose.Document {
  countryCode: string;
  countryName: string;
  users: number;
  sortOrder: number;
}

const dashboardCountryStatSchema = new mongoose.Schema<IDashboardCountryStatDoc>(
  {
    countryCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    countryName: { type: String, required: true, trim: true },
    users: { type: Number, required: true, min: 0 },
    sortOrder: { type: Number, required: true, min: 0, index: true },
  },
  { timestamps: false }
);

dashboardCountryStatSchema.index({ sortOrder: 1, countryCode: 1 });

export const DashboardCountryStatModel = mongoose.model<IDashboardCountryStatDoc>(
  'DashboardCountryStat',
  dashboardCountryStatSchema
);
