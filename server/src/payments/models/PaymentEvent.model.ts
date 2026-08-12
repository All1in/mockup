import mongoose from 'mongoose';

export interface IPaymentEventDoc extends mongoose.Document {
  stripeEventId: string;
  type: string;
  paymentIntentId?: string;
  livemode: boolean;
  apiVersion?: string;
  processedAt: Date;
  createdAt: Date;
}

const paymentEventSchema = new mongoose.Schema<IPaymentEventDoc>(
  {
    stripeEventId: { type: String, required: true, unique: true },
    type: { type: String, required: true, index: true },
    paymentIntentId: { type: String, required: false, index: true },
    livemode: { type: Boolean, required: true },
    apiVersion: { type: String, required: false },
    processedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PaymentEventModel = mongoose.model<IPaymentEventDoc>('PaymentEvent', paymentEventSchema);
