/**
 * global.setup.ts
 *
 * Логінеться один раз реальним seed-юзером і зберігає cookies в
 * tests/.auth/user.json. Цей storageState використовують тести
 * що потребують pre-authenticated контекст (welcome, blog, тощо).
 *
 * Запускається ПІСЛЯ webServer і ДО будь-яких тестів.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const STORAGE_STATE_PATH = path.join(__dirname, '../.auth/user.json');

const BASE_URL     = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
const TEST_EMAIL   = process.env.TEST_USER_EMAIL    ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'Password123!';

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(`${BASE_URL}/sign-in`);
  await page.locator('#signin-email').fill(TEST_EMAIL);
  await page.locator('#signin-password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(`${BASE_URL}/welcome`, { timeout: 15_000 });

  // Зберігаємо cookies + localStorage для reuse
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}