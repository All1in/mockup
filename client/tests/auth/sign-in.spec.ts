/**
 * Sign In — E2E тести
 *
 * Теги:
 *   @smoke      — мінімальний набір, запускається на кожен push (тільки Chromium)
 *   @regression — повне покриття, запускається перед релізом (всі браузери)
 *
 * Запуск:
 *   npx playwright test --grep @smoke
 *   npx playwright test --grep @regression
 *   npx playwright test tests/auth/sign-in.spec.ts --ui
 */

import { test, expect, LOGIN_RESPONSES } from '../fixtures/auth.fixture';

// ─── Константи ────────────────────────────────────────────────────────────

const SEED_USER = {
  email:    process.env.TEST_USER_EMAIL    ?? 'test@example.com',
  password: process.env.TEST_USER_PASSWORD ?? 'Password123!',
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// @smoke — базові перевірки, реальний API, запускаються завжди
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Sign In @smoke', () => {

  test('сторінка відображає форму входу', async ({ signInPage }) => {
    await expect(signInPage.heading).toBeVisible();
    await expect(signInPage.emailInput).toBeVisible();
    await expect(signInPage.passwordInput).toBeVisible();
    await expect(signInPage.submitButton).toBeEnabled();
  });

  test('успішний логін → redirect на /welcome', async ({ page, signInPage }) => {
    await signInPage.login(SEED_USER.email, SEED_USER.password);

    await page.waitForURL('/welcome');
    await expect(page.getByText('Welcome to our app!')).toBeVisible();
  });

  test('сесія зберігається після page reload', async ({ page, signInPage }) => {
    await signInPage.login(SEED_USER.email, SEED_USER.password);
    await page.waitForURL('/welcome');

    await page.reload();

    // Middleware перевіряє access_token cookie — якщо вона є, /welcome доступна
    await expect(page).toHaveURL('/welcome');
    await expect(page.getByText('Welcome to our app!')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// Middleware / route protection (реальний Next.js proxy)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Route protection', () => {

  test('/welcome без токена → redirect на /sign-in з callbackUrl', async ({ page }) => {
    // Окремий page без cookies (fixture signInPage не потрібен)
    await page.goto('/welcome');

    // proxy.ts встановлює ?callbackUrl=%2Fwelcome
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fwelcome/);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// callbackUrl — redirect flow після успішного логіну
// ═════════════════════════════════════════════════════════════════════════════

test.describe('callbackUrl', () => {

  test('валідний внутрішній шлях → redirect туди після логіну', async ({ page, signInPage }) => {
    await signInPage.goto({ callbackUrl: '/blog' });
    await signInPage.login(SEED_USER.email, SEED_USER.password);

    await page.waitForURL('/blog');
  });

  test('open redirect guard: зовнішній URL → fallback на /welcome', async ({ page, signInPage }) => {
    // sign-in/page.tsx: callbackUrl.startsWith('/') — якщо ні, redirect на /welcome
    await signInPage.goto({ callbackUrl: 'https://evil.com' });
    await signInPage.login(SEED_USER.email, SEED_USER.password);

    await page.waitForURL('/welcome');
    // Явно перевіряємо origin — щоб переконатись що не вийшли за межі localhost
    await expect(page).toHaveURL('http://localhost:3001/welcome');
  });

  test('circular redirect guard: callbackUrl=/sign-in → fallback на /welcome', async ({ page, signInPage }) => {
    await signInPage.goto({ callbackUrl: '/sign-in' });
    await signInPage.login(SEED_USER.email, SEED_USER.password);

    // /sign-in після логіну не має сенсу — очікуємо /welcome
    // (залежить від логіки в page.tsx; якщо не реалізовано — тест покаже регресію)
    await page.waitForURL(/\/(welcome|sign-in)/);
    await expect(page).not.toHaveURL('/sign-in');
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// @regression — sad path через мок API (без ризику rate limiting)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Sad path @regression', () => {

  test('невалідні credentials → показує помилку, URL не змінюється', async ({
    page, signInPage, mockLogin,
  }) => {
    await mockLogin((route) => route.fulfill(LOGIN_RESPONSES.invalidCredentials()));

    await signInPage.login(SEED_USER.email, 'wrong-password-123');

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL('/sign-in');
  });

  test('кнопка disabled і показує "Signing in..." під час запиту', async ({
    page, signInPage, mockLogin,
  }) => {
    // Затримуємо відповідь → гарантовано ловимо loading-стан без race condition
    await mockLogin(async (route) => {
      await page.waitForTimeout(400);
      await route.fulfill(LOGIN_RESPONSES.invalidCredentials());
    });

    await signInPage.fillEmail(SEED_USER.email);
    await signInPage.fillPassword('wrong-password-123');
    await signInPage.submit();

    // Поки запит "летить" — перевіряємо UI
    await expect(signInPage.submitButton).toBeDisabled();
    await expect(signInPage.submitButton).toHaveText('Signing in...');

    // Чекаємо завершення і перевіряємо що форма відновилась
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(signInPage.submitButton).toBeEnabled();
  });

  test('500 від сервера → показує повідомлення про помилку', async ({
    page, signInPage, mockLogin,
  }) => {
    await mockLogin((route) => route.fulfill(LOGIN_RESPONSES.serverError()));

    await signInPage.login(SEED_USER.email, SEED_USER.password);

    await expect(page.getByText('Internal server error')).toBeVisible();
    await expect(page).toHaveURL('/sign-in');
  });

  test('мережева помилка (abort) → форма відновлюється, redirect відсутній', async ({
    page, signInPage, mockLogin,
  }) => {
    await mockLogin((route) => route.abort('failed'));

    await signInPage.login(SEED_USER.email, SEED_USER.password);

    // Не перевіряємо точний текст (залежить від axios internals),
    // але перевіряємо що UX-стан коректний
    await expect(page).toHaveURL('/sign-in');
    await expect(signInPage.submitButton).toBeEnabled();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// @regression — клієнтська валідація (Zod + react-hook-form)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Client-side validation @regression', () => {

  test('порожній email після blur → "Email is required"', async ({ signInPage }) => {
    await signInPage.emailInput.click();
    await signInPage.blurEmail();

    await expect(signInPage.emailHelperText).toHaveText('Email is required');
  });

  test('невалідний формат email → "Please enter a valid email address."', async ({ signInPage }) => {
    await signInPage.fillEmail('not-an-email');
    await signInPage.blurEmail();

    await expect(signInPage.emailHelperText).toHaveText('Please enter a valid email address.');
  });

  test('пароль < 8 символів → "Password must be at least 8 characters long."', async ({ signInPage }) => {
    await signInPage.fillPassword('123');
    await signInPage.blurPassword();

    await expect(signInPage.passwordHelperText).toHaveText('Password must be at least 8 characters long.');
  });

  test('сабміт порожньої форми → HTTP запит НЕ відправляється', async ({
    page, signInPage, mockLogin,
  }) => {
    let requestFired = false;
    await mockLogin((route) => {
      requestFired = true;
      return route.continue();
    });

    await signInPage.submit();

    // Validation errors мають з'явитись — це підтверджує що форма не пройшла
    await expect(signInPage.emailHelperText).toHaveText('Email is required');
    // Синхронна перевірка після того як assertions пройшли — запит точно не пішов
    expect(requestFired).toBe(false);
    await expect(page).toHaveURL('/sign-in');
  });

});