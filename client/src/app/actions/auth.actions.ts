'use server';

import { signInSchema } from '@/utils/signInSchema';
import { cookies } from 'next/headers';

export type SignInActionState =
  | { status: 'idle' }
  | { status: 'success'; accessExpiresIn: number }
  | { status: 'error'; code: string; message: string };

function parseCookieString(
  raw: string,
): { name: string; value: string; options: Record<string, unknown> } | null {
  const parts = raw.split(';').map((s) => s.trim());
  const nameValue = parts[0];
  const eqIdx = nameValue.indexOf('=');
  if (eqIdx === -1) return null;

  const name = nameValue.slice(0, eqIdx).trim();
  const value = nameValue.slice(eqIdx + 1).trim();
  const options: Record<string, unknown> = {};

  for (const attr of parts.slice(1)) {
    const [key, val] = attr.split('=').map((s) => s.trim());
    switch (key.toLowerCase()) {
      case 'path':      options.path = val;                                           break;
      case 'domain':    options.domain = val;                                         break;
      case 'max-age':   options.maxAge = parseInt(val, 10);                           break;
      case 'expires':   options.expires = new Date(val);                              break;
      case 'samesite':  options.sameSite = val.toLowerCase() as 'strict' | 'lax' | 'none'; break;
      case 'httponly':  options.httpOnly = true;                                      break;
      case 'secure':    options.secure = true;                                        break;
    }
  }

  return { name, value, options };
}

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: 'error', code: 'VALIDATION_ERROR', message: issue.message };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { status: 'error', code: 'TIMEOUT', message: 'Request timed out. Try again.' };
    }
    return { status: 'error', code: 'NETWORK_ERROR', message: 'Unable to reach server.' };
  } finally {
    clearTimeout(timeoutId);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: 'error', code: 'PARSE_ERROR', message: 'Unexpected server response.' };
  }

  if (!res.ok) {
    const errBody = body as { message?: string; code?: string };
    return {
      status: 'error',
      code: errBody.code ?? 'LOGIN_FAILED',
      message: errBody.message ?? 'Invalid credentials.',
    };
  }

  const setCookieHeaders = res.headers.getSetCookie();
  const cookieStore = await cookies();

  for (const raw of setCookieHeaders) {
    const cookie = parseCookieString(raw);
    if (cookie) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cookieStore.set(cookie.name, cookie.value, cookie.options as any);
    }
  }

  const data = body as { accessExpiresIn?: number };
  return { status: 'success', accessExpiresIn: data.accessExpiresIn ?? 900 };
}