import mongoose from 'mongoose';
import { SUPPORTED_PAYMENT_CURRENCIES, type PaymentOrderStatus } from '../payment.entities';

export interface IPaymentOrderDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  idempotencyKey: string;
  stripePaymentIntentId?: string;
  description?: string;
  metadata: Map<string, string>;
  lastError?: {
    code?: string;
    message: string;
  };
  paidAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentOrderSchema = new mongoose.Schema<IPaymentOrderDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, enum: SUPPORTED_PAYMENT_CURRENCIES },
    status: {
      type: String,
      required: true,
      enum: [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'succeeded',
        'canceled',
        'creation_failed',
      ],
      default: 'requires_payment_method',
    },
    idempotencyKey: { type: String, required: true },
    stripePaymentIntentId: { type: String, required: false },
    description: { type: String, required: false, maxlength: 200 },
    metadata: { type: Map, of: String, default: {} },
    lastError: {
      code: { type: String, required: false },
      message: { type: String, required: false },
    },
    paidAt: { type: Date, required: false },
    canceledAt: { type: Date, required: false },
  },
  { timestamps: true }
);

paymentOrderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
paymentOrderSchema.index(
  { stripePaymentIntentId: 1 },
  { unique: true, sparse: true }
);

export const PaymentOrderModel = mongoose.model<IPaymentOrderDoc>('PaymentOrder', paymentOrderSchema);
