export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret-min-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret-min-32-chars',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',

  COOKIE_ACCESS_NAME: 'access_token',
  COOKIE_REFRESH_NAME: 'refresh_token',
  MONGO_URI: process.env.MONGO_URI ?? 'error: MONGO_URI is not set',

  get cookieSecure(): boolean {
    return this.NODE_ENV === 'production';
  },
} as const;
