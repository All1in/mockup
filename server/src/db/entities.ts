export interface User {
  id: string;
  email: string;
  passwordHash: string;
  /** Legacy single-field name used by existing /auth/register */
  name?: string;
  /** Multi-step registration fields (optional for backward compatibility) */
  firstName?: string;
  lastName?: string;
  accountType?: 'personal' | 'business';
  birthDate?: Date;
  companyName?: string;
  inn?: string;
  avatarUrl?: string;
  companyDocumentUrl?: string;
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
  firstName?: string;
  lastName?: string;
  accountType?: 'personal' | 'business';
  birthDate?: Date;
  companyName?: string;
  inn?: string;
  avatarUrl?: string;
  companyDocumentUrl?: string;
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
