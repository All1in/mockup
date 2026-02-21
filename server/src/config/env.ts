export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret-min-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret-min-32-chars',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',

  COOKIE_ACCESS_NAME: 'access_token',
  COOKIE_REFRESH_NAME: 'refresh_token',
  get MONGO_URI(): string {
    const uri = process.env.MONGO_URI;
    if (!uri || uri.trim() === '') {
      throw new Error('MONGO_URI is not set. Set it in .env');
    }
    return uri;
  },

  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  API_BASE_URL: process.env.API_BASE_URL ?? '',
  OAUTH_STATE_SECRET: process.env.OAUTH_STATE_SECRET ?? 'change-me-oauth-state-secret-min-32-chars',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',

  get cookieSecure(): boolean {
    return this.NODE_ENV === 'production';
  },
} as const;
