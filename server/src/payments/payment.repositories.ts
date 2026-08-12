import mongoose from 'mongoose';
import { PaymentOrderModel } from './models/PaymentOrder.model';
import { PaymentEventModel } from './models/PaymentEvent.model';
import type {
  CreatePaymentEventInput,
  CreatePaymentOrderInput,
  PaymentCurrency,
  PaymentEventRecord,
  PaymentOrder,
  PaymentOrderStatus,
  UpdatePaymentOrderInput,
} from './payment.entities';

type PaymentOrderDocShape = {
  _id: unknown;
  userId: unknown;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  idempotencyKey: string;
  stripePaymentIntentId?: string;
  description?: string;
  metadata?: Map<string, string> | Record<string, string>;
  lastError?: {
    code?: string;
    message?: string;
  };
  paidAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentEventDocShape = {
  _id: unknown;
  stripeEventId: string;
  type: string;
  paymentIntentId?: string;
  livemode: boolean;
  apiVersion?: string;
  processedAt: Date;
  createdAt: Date;
};

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
  );
}

function toPlainMetadata(metadata?: Map<string, string> | Record<string, string>): Record<string, string> {
  if (!metadata) return {};
  if (metadata instanceof Map) return Object.fromEntries(metadata.entries());
  return { ...metadata };
}

function toPaymentOrder(doc: PaymentOrderDocShape): PaymentOrder {
  const lastErrorMessage = doc.lastError?.message;

  return {
    id: String(doc._id),
    userId: String(doc.userId),
    amount: doc.amount,
    currency: doc.currency as PaymentCurrency,
    status: doc.status,
    idempotencyKey: doc.idempotencyKey,
    stripePaymentIntentId: doc.stripePaymentIntentId,
    description: doc.description,
    metadata: toPlainMetadata(doc.metadata),
    lastError: lastErrorMessage
      ? {
          code: doc.lastError?.code,
          message: lastErrorMessage,
        }
      : undefined,
    paidAt: doc.paidAt,
    canceledAt: doc.canceledAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPaymentEventRecord(doc: PaymentEventDocShape): PaymentEventRecord {
  return {
    id: String(doc._id),
    stripeEventId: doc.stripeEventId,
    type: doc.type,
    paymentIntentId: doc.paymentIntentId,
    livemode: doc.livemode,
    apiVersion: doc.apiVersion,
    processedAt: doc.processedAt,
    createdAt: doc.createdAt,
  };
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

export function createPaymentOrderRepository() {
  return {
    async findById(id: string): Promise<PaymentOrder | null> {
      const doc = await PaymentOrderModel.findById(id).lean();
      return doc ? toPaymentOrder(doc) : null;
    },

    async findByIdForUser(id: string, userId: string): Promise<PaymentOrder | null> {
      const doc = await PaymentOrderModel.findOne({ _id: toObjectId(id), userId: toObjectId(userId) }).lean();
      return doc ? toPaymentOrder(doc) : null;
    },

    async findByUserAndIdempotencyKey(userId: string, idempotencyKey: string): Promise<PaymentOrder | null> {
      const doc = await PaymentOrderModel.findOne({ userId: toObjectId(userId), idempotencyKey }).lean();
      return doc ? toPaymentOrder(doc) : null;
    },

    async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<PaymentOrder | null> {
      const doc = await PaymentOrderModel.findOne({ stripePaymentIntentId }).lean();
      return doc ? toPaymentOrder(doc) : null;
    },

    async create(data: CreatePaymentOrderInput): Promise<PaymentOrder> {
      const doc = await PaymentOrderModel.create({
        userId: toObjectId(data.userId),
        amount: data.amount,
        currency: data.currency,
        status: 'requires_payment_method',
        idempotencyKey: data.idempotencyKey,
        description: data.description,
        metadata: data.metadata ?? {},
      });
      return toPaymentOrder(doc.toObject());
    },

    async updateById(id: string, patch: UpdatePaymentOrderInput): Promise<PaymentOrder | null> {
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, ''> = {};

      if (patch.status) $set.status = patch.status;
      if (patch.stripePaymentIntentId) $set.stripePaymentIntentId = patch.stripePaymentIntentId;
      if (patch.lastError === null) {
        $unset.lastError = '';
      } else if (patch.lastError) {
        $set.lastError = patch.lastError;
      }
      if (patch.paidAt === null) $unset.paidAt = '';
      else if (patch.paidAt) $set.paidAt = patch.paidAt;
      if (patch.canceledAt === null) $unset.canceledAt = '';
      else if (patch.canceledAt) $set.canceledAt = patch.canceledAt;

      const update: Record<string, unknown> = {};
      if (Object.keys($set).length > 0) update.$set = $set;
      if (Object.keys($unset).length > 0) update.$unset = $unset;

      if (Object.keys(update).length === 0) {
        return this.findById(id);
      }

      const doc = await PaymentOrderModel.findByIdAndUpdate(id, update, { new: true }).lean();
      return doc ? toPaymentOrder(doc) : null;
    },

    isDuplicateKeyError,
  };
}

export function createPaymentEventRepository() {
  return {
    async createIfAbsent(data: CreatePaymentEventInput): Promise<PaymentEventRecord | null> {
      try {
        const doc = await PaymentEventModel.create(data);
        return toPaymentEventRecord(doc.toObject());
      } catch (error) {
        if (isDuplicateKeyError(error)) return null;
        throw error;
      }
    },
  };
}

export type IPaymentOrderRepository = ReturnType<typeof createPaymentOrderRepository>;
export type IPaymentEventRepository = ReturnType<typeof createPaymentEventRepository>;
