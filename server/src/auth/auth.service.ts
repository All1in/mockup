import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { IUserRepository, IRefreshTokenRepository } from '../db/repositories';
import type { User } from '../db/entities';
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
} from './token.service';

const SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'REFRESH_INVALID' | 'REFRESH_REVOKED' | 'REFRESH_EXPIRED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository
  ) {}

  async register(email: string, password: string): Promise<RegisterResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new AuthError('User with this email already exists', 'EMAIL_TAKEN');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepo.create({ email: normalizedEmail, passwordHash });

    const accessToken = signAccessToken(user);
    const jti = crypto.randomUUID();
    const refreshTokenJwt = signRefreshToken(user.id, jti);
    const expiresAt = getRefreshTokenExpiresAt();

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshTokenJwt),
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, passwordHash: '', createdAt: user.createdAt },
      accessToken,
      refreshToken: refreshTokenJwt,
    };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const accessToken = signAccessToken(user);
    const jti = crypto.randomUUID();
    const refreshTokenJwt = signRefreshToken(user.id, jti);
    const tokenHash = hashRefreshToken(refreshTokenJwt);
    const expiresAt = getRefreshTokenExpiresAt();

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshTokenJwt),
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, passwordHash: '', createdAt: user.createdAt },
      accessToken,
      refreshToken: refreshTokenJwt,
    };
  }

  async refresh(refreshTokenFromCookie: string): Promise<RefreshResult> {
    const payload = verifyRefreshToken(refreshTokenFromCookie);
    if (!payload) {
      throw new AuthError('Invalid or expired refresh token', 'REFRESH_INVALID');
    }

    const tokenHash = hashRefreshToken(refreshTokenFromCookie);
    const record = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!record) {
      throw new AuthError('Refresh token not found', 'REFRESH_INVALID');
    }
    if (record.revokedAt) {
      throw new AuthError('Refresh token has been revoked', 'REFRESH_REVOKED');
    }
    if (new Date() > record.expiresAt) {
      throw new AuthError('Refresh token expired', 'REFRESH_EXPIRED');
    }

    const user = await this.userRepo.findById(record.userId);
    if (!user) {
      throw new AuthError('User not found', 'REFRESH_INVALID');
    }

    await this.refreshTokenRepo.revokeById(record.id);

    const accessToken = signAccessToken(user);
    const newRefreshJwt = signRefreshToken(user.id, crypto.randomUUID());
    const newTokenHash = hashRefreshToken(newRefreshJwt);
    const expiresAt = getRefreshTokenExpiresAt();

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, passwordHash: '', createdAt: user.createdAt },
      accessToken,
      refreshToken: newRefreshJwt,
    };
  }

  async logout(refreshTokenFromCookie: string | undefined): Promise<void> {
    if (!refreshTokenFromCookie) return;
    const tokenHash = hashRefreshToken(refreshTokenFromCookie);
    const record = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (record && !record.revokedAt) {
      await this.refreshTokenRepo.revokeById(record.id);
    }
  }
}
