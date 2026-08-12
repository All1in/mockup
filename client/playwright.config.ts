import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './tests/setup/global.setup';

const STUB_PORT = Number(process.env.STUB_PORT ?? 4010);
const STUB_URL = `http://localhost:${STUB_PORT}`;

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
    // 'on' записував trace для кожного тесту — це десятки мегабайт на прогін
    // і час на кожному зеленому тесті, який ніхто ніколи не відкриє.
    // Trace потрібен там, де щось впало: перший retry його й дає.
    trace: 'on-first-retry',
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

  // Два сервери: стаб бекенда і сам застосунок. Порядок важливий лише тим, що
  // BACKEND_URL має вказувати на стаб ще до старту Next — змінна читається на
  // рівні модуля (next.config.ts і auth.actions.ts), тобто один раз при старті.
  webServer: [
    {
      command: 'node tests/support/stub-backend.mjs',
      url: `http://localhost:${STUB_PORT}/health`,
      // Ніколи не перевикористовувати чужий процес — навіть локально.
      // reuseExistingServer підхоплює будь-що, що відповідає на цьому порту,
      // і при цьому ігнорує заданий command та env. Тоді тести йдуть не туди,
      // куди ми думаємо, і лишаються зеленими. Зайняті порти краще хай падають
      // голосно, ніж тихо підмінюють предмет перевірки.
      reuseExistingServer: false,
      stdout: 'pipe',
    },
    {
      // Локально — dev (швидкий старт, hot reload). У CI — те, що поїде в
      // прод: production build. Різниця не косметична — dev інакше поводиться
      // з таймінгами й помилками, і тест, зелений у dev, це ще не тест,
      // зелений у прод-збірці. Білд у CI робить окремий крок job'и.
      command: process.env.CI ? 'npx next start -p 3001' : 'npm run dev',
      url: 'http://localhost:3001',
      // Те саме, і тут ціна помилки вища: живий dev-сервер, піднятий вручну,
      // читає client/.env із реальним бекендом на :4000. Перевикориставши
      // його, весь прогін мовчки тестує справжній сервер замість стабу.
      reuseExistingServer: false,
      env: {
        BACKEND_URL: STUB_URL,
        // Порожнє значення = same-origin: браузер б'є в Next, Next проксює на
        // BACKEND_URL. Задане тут явно, щоб локальний client/.env (де стоїть
        // реальний бекенд на :4000) не перетягнув тести на справжній сервер.
        NEXT_PUBLIC_API_URL: '',
      },
    },
  ],
});