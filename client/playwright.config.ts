import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './tests/setup/global.setup';

export default defineConfig({
  testDir: './tests',
  // globalSetup: './tests/setup/global.setup.ts', // TODO: увімкнути коли з'являться тести в protected/

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── Smoke: тільки Chromium, швидко, на кожен push ──────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Regression: всі браузери, перед релізом ─────────────────────────────
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // ── Authenticated: pre-logged-in контекст для protected-page тестів ─────
    // Використовується тестами /welcome, /blog тощо (НЕ sign-in тестами).
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
      // Тести для authenticated-проєкту мають бути в окремій директорії,
      // наприклад tests/protected/
      testMatch: '**/protected/**/*.spec.ts',
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});