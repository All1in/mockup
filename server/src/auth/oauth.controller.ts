import type { Request, Response } from 'express';
import { setAuthCookies } from './token.service';
import { createOAuthState, verifyOAuthState } from './oauth/state.service';
import { getAuthorizationUrl } from './oauth/providers.config';
import { exchangeCodeForAccessToken, fetchOAuthProfile } from './oauth/exchange.service';
import { socialLoginOrRegister } from './social.service';
import { SocialAuthError } from './social.service';
import { env } from '../config/env';
import type { IUserRepository, IRefreshTokenRepository, IProviderAccountRepository } from '../db/repositories';

const SUPPORTED_PROVIDERS = ['google', 'facebook'] as const;
type ProviderParam = (typeof SUPPORTED_PROVIDERS)[number];

function isSupportedProvider(provider: string): provider is ProviderParam {
  return SUPPORTED_PROVIDERS.includes(provider as ProviderParam);
}

export function createOAuthController(
  userRepo: IUserRepository,
  refreshTokenRepo: IRefreshTokenRepository,
  providerAccountRepo: IProviderAccountRepository
) {
  return {
    /**
     * GET /auth/:provider — redirects to provider OAuth authorization URL with state (CSRF protection).
     * Optional query: redirectPath — path on frontend to redirect after success (e.g. /dashboard).
     */
    redirectToProvider(req: Request, res: Response): void {
      const provider = req.path.replace(/^\//, '').split('/')[0] as string;
      if (!isSupportedProvider(provider)) {
        res.status(400).json({ error: 'Bad Request', message: `Unsupported provider: ${provider}` });
        return;
      }
      const redirectPath = typeof req.query.redirectPath === 'string' ? req.query.redirectPath : undefined;
      const state = createOAuthState(redirectPath);
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60 * 1000,
      });
      const url = getAuthorizationUrl(provider, state);
      res.redirect(302, url);
    },

    /**
     * GET /auth/:provider/callback — provider redirects here with ?code=...&state=...
     * Exchanges code for token, fetches profile, finds/creates user, issues our JWT, sets cookies, redirects to frontend.
     */
    async handleCallback(req: Request, res: Response): Promise<void> {
      const provider = req.path.replace(/^\//, '').split('/')[0] as string;
      if (!isSupportedProvider(provider)) {
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=unsupported_provider`);
        return;
      }
      const stateFromProvider = req.query.state as string | undefined;
      const code = req.query.code as string | undefined;
      const storedState = req.cookies?.oauth_state;

      if (!code) {
        const error = (req.query.error as string) || 'missing_code';
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=${encodeURIComponent(error)}`);
        return;
      }
      if (!stateFromProvider || !storedState || stateFromProvider !== storedState) {
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=invalid_state`);
        return;
      }
      res.clearCookie('oauth_state', { path: '/', httpOnly: true, secure: env.cookieSecure, sameSite: 'lax' });

      let redirectPath: string | undefined;
      try {
        redirectPath = verifyOAuthState(stateFromProvider).redirectPath;
      } catch {
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=state_expired`);
        return;
      }

      let accessToken: string;
      try {
        accessToken = await exchangeCodeForAccessToken(provider, code);
      } catch (err) {
        console.error('OAuth token exchange failed:', err);
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=token_exchange_failed`);
        return;
      }

      let profile;
      try {
        profile = await fetchOAuthProfile(provider, accessToken);
      } catch (err) {
        console.error('OAuth profile fetch failed:', err);
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=profile_fetch_failed`);
        return;
      }

      try {
        const result = await socialLoginOrRegister(
          userRepo,
          providerAccountRepo,
          refreshTokenRepo,
          profile
        );
        setAuthCookies(res, result.accessToken, result.refreshToken);
        const base = env.FRONTEND_URL.replace(/\/$/, '');
        const path = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/welcome';
        res.redirect(302, `${base}${path}`);
      } catch (e) {
        if (e instanceof SocialAuthError) {
          const msg = encodeURIComponent(e.message);
          res.redirect(`${env.FRONTEND_URL}/sign-in?error=social&message=${msg}`);
          return;
        }
        console.error('Social login failed:', e);
        res.redirect(`${env.FRONTEND_URL}/sign-in?error=social_login_failed`);
      }
    },

    /**
     * POST /auth/social — optional: frontend sends provider + accessToken; we verify token with provider,
     * then find/create user, link provider, issue our JWT. Same response contract as POST /login.
     */
    async verifyTokenAndLogin(req: Request, res: Response): Promise<void> {
      const { provider: rawProvider, accessToken } = req.body as { provider?: string; accessToken?: string };
      if (!rawProvider || !accessToken || typeof accessToken !== 'string' || !isSupportedProvider(rawProvider)) {
        res.status(400).json({ error: 'Bad Request', message: 'provider (google|facebook) and accessToken required' });
        return;
      }
      const provider = rawProvider as ProviderParam;
      let profile;
      try {
        profile = await fetchOAuthProfile(provider, accessToken);
      } catch (err) {
        console.error('OAuth profile fetch failed:', err);
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired provider token' });
        return;
      }
      try {
        const result = await socialLoginOrRegister(
          userRepo,
          providerAccountRepo,
          refreshTokenRepo,
          profile
        );
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            createdAt: result.user.createdAt,
          },
        });
      } catch (e) {
        if (e instanceof SocialAuthError) {
          res.status(400).json({ error: 'Bad Request', message: e.message });
          return;
        }
        console.error('Social login failed:', e);
        res.status(500).json({ error: 'Internal Server Error', message: 'Social login failed' });
      }
    },
  };
}
