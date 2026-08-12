import mongoose from 'mongoose';
import { UserModel } from './models/User.model';
import { RefreshTokenModel } from './models/RefreshToken.model';
import { ProviderAccountModel } from './models/ProviderAccount.model';
import type { User } from './entities';
import type {
  CreateUserInput,
  CreateRefreshTokenInput,
  ProviderAccount,
  CreateProviderAccountInput,
} from './entities';
import type { RefreshTokenRecord } from './entities';

function toUser(doc: {
  _id: unknown;
  email: string;
  passwordHash: string;
  createdAt: Date;
  name?: string;
  firstName?: string;
  lastName?: string;
  accountType?: 'personal' | 'business';
  birthDate?: Date;
  companyName?: string;
  inn?: string;
  avatarUrl?: string;
  companyDocumentUrl?: string;
}): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
    name: doc.name,
    firstName: doc.firstName,
    lastName: doc.lastName,
    accountType: doc.accountType,
    birthDate: doc.birthDate,
    companyName: doc.companyName,
    inn: doc.inn,
    avatarUrl: doc.avatarUrl,
    companyDocumentUrl: doc.companyDocumentUrl,
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

function toProviderAccount(doc: {
  _id: unknown;
  provider: string;
  providerUserId: string;
  userId: unknown;
  linkedAt: Date;
}): ProviderAccount {
  return {
    id: String(doc._id),
    provider: doc.provider as ProviderAccount['provider'],
    providerUserId: doc.providerUserId,
    userId: String(doc.userId),
    linkedAt: doc.linkedAt,
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
        firstName: data.firstName,
        lastName: data.lastName,
        accountType: data.accountType,
        birthDate: data.birthDate,
        companyName: data.companyName,
        inn: data.inn,
        avatarUrl: data.avatarUrl,
        companyDocumentUrl: data.companyDocumentUrl,
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

export function createProviderAccountRepository() {
  return {
    async findByProviderAndProviderUserId(
      provider: 'google' | 'facebook',
      providerUserId: string
    ): Promise<ProviderAccount | null> {
      const doc = await ProviderAccountModel.findOne({ provider, providerUserId }).lean();
      return doc ? toProviderAccount(doc) : null;
    },
    async findByUserId(userId: string): Promise<ProviderAccount[]> {
      const docs = await ProviderAccountModel.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
      return docs.map(toProviderAccount);
    },
    async create(data: CreateProviderAccountInput): Promise<ProviderAccount> {
      const doc = await ProviderAccountModel.create({
        provider: data.provider,
        providerUserId: data.providerUserId,
        userId: new mongoose.Types.ObjectId(data.userId),
      });
      return toProviderAccount(doc.toObject());
    },
  };
}

export type IUserRepository = ReturnType<typeof createUserRepository>;
export type IRefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>;
export type IProviderAccountRepository = ReturnType<typeof createProviderAccountRepository>;
