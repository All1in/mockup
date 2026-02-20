import crypto from 'crypto';
import { env } from '../../config/env';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — authorization code flow should complete quickly
const SEP = '.';

/**
 * Creates a signed state value for OAuth flow.
 * State binds the callback to the same browser and prevents CSRF (replay).
 * We embed a nonce and sign it so we can verify on callback without server-side store.
 */
export function createOAuthState(redirectPath?: string): string {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const payload = redirectPath ? `${nonce}${SEP}${Date.now()}${SEP}${redirectPath}` : `${nonce}${SEP}${Date.now()}`;
  const signature = crypto
    .createHmac('sha256', env.OAUTH_STATE_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}${SEP}${signature}`;
}

/**
 * Verifies state signature and optional TTL. Returns redirect path if embedded.
 * Throws if invalid or expired.
 */
export function verifyOAuthState(state: string): { redirectPath?: string } {
  const parts = state.split(SEP);
  if (parts.length < 3) throw new Error('Invalid state format');
  const signature = parts.pop()!;
  const payload = parts.join(SEP);
  const expectedSig = crypto
    .createHmac('sha256', env.OAUTH_STATE_SECRET)
    .update(payload)
    .digest('base64url');
  if (signature !== expectedSig) throw new Error('Invalid state signature');
  const [nonce, tsStr, ...rest] = payload.split(SEP);
  const ts = parseInt(tsStr, 10);
  if (Number.isNaN(ts) || Date.now() - ts > STATE_TTL_MS) throw new Error('State expired');
  const redirectPath = rest.length > 0 ? rest.join(SEP) : undefined;
  return { redirectPath };
}
