export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret-min-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret-min-32-chars',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',

  COOKIE_ACCESS_NAME: 'access_token',
  COOKIE_REFRESH_NAME: 'refresh_token',
  /** When front proxies API at /api, set to '/api/auth' so refresh cookie is sent to /api/auth/refresh. */
  COOKIE_REFRESH_PATH: process.env.COOKIE_REFRESH_PATH ?? '/auth',
  get MONGO_URI(): string {
    const uri = process.env.MONGO_URI;
    if (!uri || uri.trim() === '') {
      throw new Error('MONGO_URI is not set. Set it in .env');
    }
    return uri;
  },

  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  API_BASE_URL: process.env.API_BASE_URL ?? '',
  OAUTH_STATE_SECRET: process.env.OAUTH_STATE_SECRET ?? 'change-me-oauth-state-secret-min-32-chars',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_API_VERSION: process.env.STRIPE_API_VERSION ?? '',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',

  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ?? '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ?? '',

  // ── Об'єктне сховище ────────────────────────────────────────────────────
  //
  // S3-сумісне. Локально й у CI — MinIO з docker-compose, у проді — R2/S3.
  // STORAGE_ENDPOINT порожній означає справжній AWS S3.
  STORAGE_BUCKET: process.env.STORAGE_BUCKET ?? 'mockup-uploads',
  get STORAGE_REGION(): string {
    const endpoint = process.env.STORAGE_ENDPOINT ?? '';
    const region = process.env.STORAGE_REGION ?? '';

    // Якщо endpoint порожній, це справжній AWS S3 — region обов'язковий.
    if (!endpoint || endpoint.trim() === '') {
      if (!region || region.trim() === '') {
        throw new Error(
          'STORAGE_REGION is required when STORAGE_ENDPOINT is empty (AWS S3 mode). ' +
          'Set a valid AWS region (e.g., us-east-1) in .env'
        );
      }
      // Базова перевірка формату AWS регіону
      if (!/^[a-z]{2}-[a-z]+-\d+$/.test(region)) {
        throw new Error(
          `STORAGE_REGION "${region}" does not look like a valid AWS region (expected format: us-east-1, eu-west-2, etc.)`
        );
      }
    }

    return region || 'auto';
  },
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT ?? '',
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID ?? '',
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
  STORAGE_FORCE_PATH_STYLE: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',

  /**
   * Скільки живе підписане посилання на приватний файл.
   *
   * 60 секунд — це час, потрібний браузеру, щоб піти за редіректом і
   * завантажити файл, і не більше. Посилання неминуче витікає: в HTML, в
   * історію, в логи проксі. Довга TTL перетворює «приватний файл» на
   * публічний із відкладеним терміном дії.
   */
  get STORAGE_SIGNED_URL_TTL(): number {
    const raw = process.env.STORAGE_SIGNED_URL_TTL ?? '60';
    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(
        `STORAGE_SIGNED_URL_TTL must be a positive integer, got: "${raw}"`
      );
    }

    return parsed;
  },

  get cookieSecure(): boolean {
    return this.NODE_ENV === 'production';
  },
} as const;
