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
