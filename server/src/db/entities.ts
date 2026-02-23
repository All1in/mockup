export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/** Provider account link: one user can have multiple providers (google, facebook). */
export interface ProviderAccount {
  id: string;
  provider: 'google' | 'facebook';
  providerUserId: string;
  userId: string;
  linkedAt: Date;
}

export interface CreateProviderAccountInput {
  provider: 'google' | 'facebook';
  providerUserId: string;
  userId: string;
}
