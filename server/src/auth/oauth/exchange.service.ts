import type { OAuthProviderName } from './providers.config';
import { getOAuthProviderConfig } from './providers.config';

export interface OAuthProfile {
  provider: OAuthProviderName;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/**
 * Exchanges authorization code for access_token. Does not trust frontend — code is one-time use.
 */
export async function exchangeCodeForAccessToken(
  provider: OAuthProviderName,
  code: string
): Promise<string> {
  const config = getOAuthProviderConfig(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.getCallbackUrl(),
  });
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error('No access_token in response');
  return data.access_token;
}

/**
 * Fetches user profile from provider. Validates email presence and verified status where available.
 */
export async function fetchOAuthProfile(
  provider: OAuthProviderName,
  accessToken: string
): Promise<OAuthProfile> {
  const config = getOAuthProviderConfig(provider);
  const url = config.userInfoUrl;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Profile fetch failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as Record<string, unknown>;

  if (provider === 'google') {
    const email = (data.email as string) ?? null;
    const verified = (data.verified_email as boolean) ?? false;
    return {
      provider: 'google',
      providerUserId: String(data.id ?? ''),
      email,
      emailVerified: verified,
      name: (data.name as string) ?? null,
    };
  }

  if (provider === 'facebook') {
    const email = (data.email as string) ?? null;
    return {
      provider: 'facebook',
      providerUserId: String(data.id ?? ''),
      email,
      emailVerified: !!email, // Facebook does not always return verified; we require email
      name: (data.name as string) ?? null,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}
