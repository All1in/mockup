import type { Page, Locator } from '@playwright/test';

export class SignInPage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  // MUI TextField з id="signin-email" рендерить helperText як
  // <p id="signin-email-helper-text">...</p>
  readonly emailHelperText: Locator;
  readonly passwordHelperText: Locator;

  constructor(private readonly page: Page) {
    this.heading           = page.getByRole('heading', { name: 'Sign in' });
    this.emailInput        = page.locator('#signin-email');
    this.passwordInput     = page.locator('#signin-password');
    this.submitButton      = page.getByRole('button', { name: /^sign in$/i });
    this.emailHelperText    = page.locator('#signin-email-helper-text');
    this.passwordHelperText = page.locator('#signin-password-helper-text');
  }

  async goto(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    await this.page.goto(`/sign-in${qs}`);
  }

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async blurEmail() {
    await this.emailInput.blur();
  }

  async blurPassword() {
    await this.passwordInput.blur();
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Заповнює форму і клікає Submit. Не чекає на результат — тест сам визначає що перевіряти. */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}