# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo with a Node.js/Express/TypeScript REST API backend (`server/`) and a frontend (`client/`, not yet scaffolded). The server provides JWT-based authentication with OAuth social login (Google, Facebook) and uses MongoDB via Mongoose.

## Commands

```bash
# Install dependencies (run from root or server/)
npm install            # root delegates to server
cd server && npm install

# Development (hot reload via ts-node-dev)
npm run dev            # from root — proxies to server
cd server && npm run dev

# Build & production
npm run build          # compiles TypeScript → server/dist/
npm start              # runs server/dist/index.js
```

No test framework is configured yet.

## Required Environment

Server requires `server/.env` with at minimum `MONGO_URI`. See `server/README.md` for full env var table. Key vars: `PORT` (default 4000), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, OAuth credentials.

## Architecture

### Layered structure (server/src/)

- **config/env.ts** — single env config object with defaults and validation (MONGO_URI throws if missing)
- **db/** — data layer
  - `entities.ts` — domain interfaces (User, RefreshTokenRecord, ProviderAccount) — no Mongoose dependency
  - `models/` — Mongoose schemas/models
  - `repositories.ts` — factory functions returning repository objects that map Mongoose docs to domain entities. Repository types are inferred via `ReturnType<>` (e.g., `IUserRepository`)
  - `database.ts` — MongoDB connect/disconnect
  - `seed.ts` — seeds a test user on first run (`test@example.com` / `Password123!`)
- **auth/** — authentication layer
  - `auth.service.ts` — `AuthService` class: register, login, refresh (token rotation), logout. Takes repository interfaces via constructor injection
  - `token.service.ts` — JWT sign/verify, SHA-256 refresh token hashing, cookie helpers (`setAuthCookies`/`clearAuthCookies`)
  - `auth.controller.ts` — Express request handlers
  - `auth.routes.ts` — mounts all `/auth/*` routes including OAuth
  - `auth.middleware.ts` — `createAuthMiddleware` validates access JWT, sets `req.user`
  - `auth.errors.ts` — structured 401 error codes for SPA refresh flow
  - **oauth/** — OAuth subsystem: `providers.config.ts` (Google/Facebook config), `exchange.service.ts` (code→token exchange), `state.service.ts` (CSRF state signing)
  - `social.service.ts` — `socialLoginOrRegister`: find-or-create user from OAuth profile, link provider accounts
  - `oauth.controller.ts` — OAuth redirect and callback handlers
- **index.ts** — entry point: wires CORS, middleware, repositories, services, routes; starts server

### Key patterns

- **Repository pattern**: domain entities are decoupled from Mongoose. All DB access goes through repository factory functions. Mapping between Mongoose docs and domain types happens in `repositories.ts` via `toUser()`/`toRefreshTokenRecord()`/`toProviderAccount()` helpers.
- **Token rotation**: every refresh issues a new token pair and revokes the old refresh token (stored as SHA-256 hash in DB).
- **Auth via HttpOnly cookies**: tokens are set as `access_token` (path `/`) and `refresh_token` (path `/auth`) cookies with `httpOnly`, `sameSite: strict`, `secure` in production. Response bodies include `expiresIn` (seconds until access token expiry, default 900) so the client can schedule proactive refresh.
- **OAuth flow**: server-side redirect → provider → callback → `socialLoginOrRegister` → same JWT cookie flow as email/password auth. One user email can link multiple OAuth providers.
- **Structured 401 codes**: all 401 responses include a `code` field (e.g., `ACCESS_TOKEN_MISSING`, `REFRESH_EXPIRED`) for SPA-side refresh/redirect logic.

## Language & Documentation

Server README and code comments are in Ukrainian. API documentation is at `server/documentation/api.md`.
