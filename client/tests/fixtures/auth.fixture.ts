import { test as base, type Page, type Route } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

// ─── Типи кастомних fixtures ──────────────────────────────────────────────

type AuthFixtures = {
  /** Інстанс SignInPage, вже відкритий на /sign-in */
  signInPage: SignInPage;
  /**
   * Хелпер для мокування /auth/login.
   * Повертає функцію що приймає бажаний response і встановлює route mock.
   * Мок автоматично знімається після тесту.
   */
  mockLogin: (handler: (route: Route) => Promise<void> | void) => ReturnType<Page['route']>;
};

// ─── Заготовлені response-и для найпоширеніших сценаріїв ─────────────────

export const LOGIN_RESPONSES = {
  success: (email: string): Parameters<Route['fulfill']>[0] => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: 'test-user-id', email, name: 'Test User', createdAt: new Date().toISOString() },
      accessExpiresIn: 900,
    }),
  }),

  invalidCredentials: (): Parameters<Route['fulfill']>[0] => ({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }),
  }),

  serverError: (): Parameters<Route['fulfill']>[0] => ({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Internal server error' }),
  }),
} as const;

// ─── Fixture extension ────────────────────────────────────────────────────

export const test = base.extend<AuthFixtures>({
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await use(signInPage);
  },

  mockLogin: async ({ page }, use) => {
    const mock = (handler: (route: Route) => Promise<void> | void) =>
      page.route('**/auth/login', handler);
    await use(mock);
  },
});

export { expect } from '@playwright/test';