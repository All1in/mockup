import { env } from '../../config/env';

function getCallbackBaseUrl(): string {
  if (env.API_BASE_URL) return env.API_BASE_URL.replace(/\/$/, '');
  return env.PORT ? `http://localhost:${env.PORT}` : '';
}

export type OAuthProviderName = 'google' | 'facebook';

export interface OAuthProviderConfig {
  provider: OAuthProviderName;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  getCallbackUrl: () => string;
}

function getGoogleConfig(): OAuthProviderConfig {
  const callbackPath = '/auth/google/callback';
  return {
    provider: 'google',
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    getCallbackUrl: () => `${getCallbackBaseUrl()}/auth/google/callback`,
  };
}

function getFacebookConfig(): OAuthProviderConfig {
  return {
    provider: 'facebook',
    clientId: env.FACEBOOK_APP_ID,
    clientSecret: env.FACEBOOK_APP_SECRET,
    authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    scopes: ['email', 'public_profile'],
    getCallbackUrl: () => `${getCallbackBaseUrl()}/auth/facebook/callback`,
  };
}

const configs: Record<OAuthProviderName, OAuthProviderConfig> = {
  google: getGoogleConfig(),
  facebook: getFacebookConfig(),
};

export function getOAuthProviderConfig(provider: OAuthProviderName): OAuthProviderConfig {
  const config = configs[provider];
  if (!config || !config.clientId || !config.clientSecret) {
    throw new Error(`OAuth provider "${provider}" is not configured`);
  }
  return config;
}

export function getAuthorizationUrl(provider: OAuthProviderName, state: string): string {
  const config = getOAuthProviderConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.getCallbackUrl(),
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {}),
  });
  return `${config.authorizationUrl}?${params.toString()}`;
}
