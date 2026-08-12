import { test as base, request } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

/**
 * Сценарії бекенда обираються email-адресою, а не моком.
 *
 * Причина — архітектурна: логін іде через Server Action, тобто fetch виходить
 * з Node-процесу Next.js, а не з браузера. page.route() перехоплює трафік
 * браузера й до цього запиту не дотягується. Керує поведінкою стаб
 * (tests/support/stub-backend.mjs), на який вказує BACKEND_URL.
 */
export const STUB_USERS = {
  /** Єдина пара, яку стаб вважає валідною. */
  valid: { email: 'test@example.com', password: 'Password123!' },
  /** Той самий користувач із неправильним паролем → 401. */
  wrongPassword: { email: 'test@example.com', password: 'wrong-password-123' },
  /** Відповідь приходить із затримкою → видно loading-стан без race condition. */
  slow: { email: 'slow@example.com', password: 'whatever-123' },
  /** Стаб віддає 500. */
  serverError: { email: 'error500@example.com', password: 'whatever-123' },
  /** Стаб рве з'єднання → fetch у Server Action падає в catch. */
  offline: { email: 'offline@example.com', password: 'whatever-123' },
} as const;

const STUB_URL = process.env.BACKEND_URL ?? 'http://localhost:4010';

/** Стан стабу. Наразі — лічильник логінів із порожнім email. */
export async function getStubState(): Promise<{ emptyEmailLoginAttempts: number }> {
  const context = await request.newContext();
  try {
    const res = await context.get(`${STUB_URL}/__stub/state`);

    // Перевіряти відповідь тут обов'язково, і не заради акуратності.
    // Якщо стаб віддасть 404, у тілі не буде emptyEmailLoginAttempts, поле
    // стане undefined — і порівняння «до» з «після» зійдеться на двох
    // undefined. Тест лишиться зеленим, не перевіривши нічого. Тихо зелений
    // тест гірший за червоний: він ще й займає місце справжнього.
    if (!res.ok()) {
      throw new Error(
        `Стаб не віддав стан: ${res.status()} ${res.statusText()} на ${STUB_URL}/__stub/state`,
      );
    }

    const state = (await res.json()) as { emptyEmailLoginAttempts?: unknown };
    if (typeof state.emptyEmailLoginAttempts !== 'number') {
      throw new Error(
        `Стаб повернув несподіване тіло: ${JSON.stringify(state)}`,
      );
    }

    return { emptyEmailLoginAttempts: state.emptyEmailLoginAttempts };
  } finally {
    await context.dispose();
  }
}

type AuthFixtures = {
  /** Інстанс SignInPage, вже відкритий на /sign-in */
  signInPage: SignInPage;
};

export const test = base.extend<AuthFixtures>({
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await use(signInPage);
  },
});

export { expect } from '@playwright/test';
