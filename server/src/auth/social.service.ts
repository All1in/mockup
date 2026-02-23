import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { IUserRepository, IRefreshTokenRepository, IProviderAccountRepository } from '../db/repositories';
import type { User } from '../db/entities';
import type { LoginResult } from './auth.service';
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiresAt,
} from './token.service';
import type { OAuthProfile } from './oauth/exchange.service';

const SALT_ROUNDS = 12;

/** Placeholder password hash for OAuth-only users — they cannot login with email/password. */
async function getOAuthPlaceholderPasswordHash(): Promise<string> {
  return bcrypt.hash(`oauth-placeholder-${crypto.randomBytes(24).toString('hex')}`, SALT_ROUNDS);
}

export class SocialAuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMAIL_REQUIRED' | 'EMAIL_NOT_VERIFIED' | 'PROVIDER_LINK_FAILED'
  ) {
    super(message);
    this.name = 'SocialAuthError';
  }
}

/**
 * Finds or creates user from OAuth profile, links provider account, returns same shape as login
 * so existing JWT/cookie flow is unchanged.
 * One email → one user; multiple providers can link to the same user.
 */
export async function socialLoginOrRegister(
  userRepo: IUserRepository,
  providerAccountRepo: IProviderAccountRepository,
  refreshTokenRepo: IRefreshTokenRepository,
  profile: OAuthProfile
): Promise<LoginResult> {
  if (!profile.email || !profile.email.trim()) {
    throw new SocialAuthError('Email is required to sign in with this provider', 'EMAIL_REQUIRED');
  }
  if (!profile.emailVerified && profile.provider === 'google') {
    throw new SocialAuthError('Email must be verified', 'EMAIL_NOT_VERIFIED');
  }
  const normalizedEmail = profile.email.trim().toLowerCase();

  let user: User | null = await userRepo.findByEmail(normalizedEmail);
  const existingLink = await providerAccountRepo.findByProviderAndProviderUserId(
    profile.provider,
    profile.providerUserId
  );

  if (existingLink) {
    user = await userRepo.findById(existingLink.userId);
    if (!user) throw new SocialAuthError('User not found for linked provider', 'PROVIDER_LINK_FAILED');
  } else if (user) {
    await providerAccountRepo.create({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      userId: user.id,
    });
  } else {
    const passwordHash = await getOAuthPlaceholderPasswordHash();
    user = await userRepo.create({
      email: normalizedEmail,
      passwordHash,
      name: profile.name ?? undefined,
    });
    await providerAccountRepo.create({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      userId: user.id,
    });
  }

  const accessToken = signAccessToken(user);
  const jti = crypto.randomUUID();
  const refreshTokenJwt = signRefreshToken(user.id, jti);
  const expiresAt = getRefreshTokenExpiresAt();
  await refreshTokenRepo.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshTokenJwt),
    expiresAt,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, passwordHash: '', createdAt: user.createdAt },
    accessToken,
    refreshToken: refreshTokenJwt,
  };
}
