import mongoose from 'mongoose';

export type ProviderName = 'google' | 'facebook';

export interface IProviderAccountDoc extends mongoose.Document {
  provider: ProviderName;
  providerUserId: string;
  userId: mongoose.Types.ObjectId;
  linkedAt: Date;
}

const providerAccountSchema = new mongoose.Schema<IProviderAccountDoc>(
  {
    provider: { type: String, required: true, enum: ['google', 'facebook'] },
    providerUserId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    linkedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
);

// One provider user id is unique per provider (prevent duplicate links).
providerAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });
providerAccountSchema.index({ userId: 1 });

export const ProviderAccountModel = mongoose.model<IProviderAccountDoc>(
  'ProviderAccount',
  providerAccountSchema
);
