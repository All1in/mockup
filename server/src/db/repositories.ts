import mongoose from 'mongoose';
import { UserModel } from './models/User.model';
import { RefreshTokenModel } from './models/RefreshToken.model';
import type { User } from './entities';
import type { CreateUserInput, CreateRefreshTokenInput } from './entities';
import type { RefreshTokenRecord } from './entities';

function toUser(doc: { _id: unknown; email: string; passwordHash: string; createdAt: Date, name?: string }): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
    name: doc.name,
  };
}

function toRefreshTokenRecord(doc: {
  _id: unknown;
  userId: unknown;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}): RefreshTokenRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt,
    createdAt: doc.createdAt,
  };
}

export function createUserRepository() {
  return {
    async findById(id: string): Promise<User | null> {
      const doc = await UserModel.findById(id).lean();
      return doc ? toUser(doc) : null;
    },
    async findByEmail(email: string): Promise<User | null> {
      const doc = await UserModel.findOne({ email }).lean();
      return doc ? toUser(doc) : null;
    },
    async create(data: CreateUserInput): Promise<User> {
      const doc = await UserModel.create({
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: 'user',
      });
      return toUser(doc.toObject());
    },
  };
}

export function createRefreshTokenRepository() {
  return {
    async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
      const doc = await RefreshTokenModel.findOne({ tokenHash }).lean();
      return doc ? toRefreshTokenRecord(doc) : null;
    },
    async create(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
      const doc = await RefreshTokenModel.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      });
      return toRefreshTokenRecord(doc.toObject());
    },
    async revokeById(id: string): Promise<boolean> {
      const result = await RefreshTokenModel.updateOne(
        { _id: id },
        { $set: { revokedAt: new Date() } }
      );
      return result.modifiedCount > 0;
    },
  };
}

export type IUserRepository = ReturnType<typeof createUserRepository>;
export type IRefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>;
