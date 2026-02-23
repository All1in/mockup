# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo with a Next.js frontend (`client/`) and Express + TypeScript backend (`server/`), connected to MongoDB. Currently implements JWT-based authentication with OAuth (Google, Facebook).

## Development Commands

### Server (Express + TypeScript)
```bash
cd server && npm run dev      # ts-node-dev with auto-respawn on port 4000
cd server && npm run build    # TypeScript compilation to dist/
cd server && npm run start    # Run compiled JS from dist/
```

### Client (Next.js)
```bash
cd client && npm run dev      # Dev server on port 3001
cd client && npm run build    # Next.js production build
cd client && npm run lint     # ESLint
```

### Prerequisites
- MongoDB running locally on default port (27017)
- Server `.env` file with `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (see `server/src/config/env.ts` for all env vars)
- Client uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`)

## Architecture

### Backend (`server/src/`)
- **Entry**: `index.ts` — Express app setup, CORS, middleware, DB connection, seed data
- **Auth module** (`auth/`): Controller → Service → Repository pattern
  - `auth.routes.ts` — Route definitions (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, OAuth routes)
  - `auth.service.ts` — Core auth logic (register, login, refresh, logout)
  - `token.service.ts` — JWT signing/verification, cookie operations
  - `auth.middleware.ts` — Verifies JWT from cookies or Authorization header, attaches `req.user`
  - `social.service.ts` + `oauth/` — OAuth flow with HMAC-signed state
- **Database** (`db/`): Mongoose models + repository pattern
  - Models: `User`, `RefreshToken`, `ProviderAccount`
  - Repositories implement interfaces (`IUserRepository`, etc.)
  - `seed.ts` — Creates test user (`test@example.com` / `Password123!`) on startup

### Frontend (`client/src/`)
- **App Router** (`app/`): Pages at `/`, `/sign-in`, `/sign-up`, `/welcome`
- **API layer** (`lib/api/api.ts`): Axios client with `withCredentials: true` for cookie-based auth
- **Auth hook** (`hooks/useAuth.ts`): TanStack React Query wrapper for `/auth/me`
- **UI**: MUI v6 with Emotion, dark/light theme support
- **Path alias**: `@/*` maps to `src/*`

### Auth Flow
- Two-token JWT strategy: access token (15min) + refresh token (7 days), both in HTTP-only secure cookies
- Passwords hashed with bcrypt (12 rounds)
- OAuth providers redirect back to frontend after callback

### Client-Server Communication
- Axios with `withCredentials: true` sends cookies automatically
- CORS configured for frontend origin
- Server on port 4000, client on port 3001

## Code Style
- Prettier: single quotes, semicolons, trailing commas (es5), 100 char width
- ESLint: next/core-web-vitals + typescript
- TypeScript strict mode on both client and server
