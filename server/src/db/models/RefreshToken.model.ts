import mongoose from 'mongoose';

export interface IRefreshTokenDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

const refreshTokenSchema = new mongoose.Schema<IRefreshTokenDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
);

refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ userId: 1 });

export const RefreshTokenModel = mongoose.model<IRefreshTokenDoc>('RefreshToken', refreshTokenSchema);
