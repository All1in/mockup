# API Documentation

Base URL: `http://localhost:4000`

All responses are in JSON format. Tokens are passed via HTTP-only cookies automatically.

---

## Auth

### POST /auth/register

Register a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "name": "John"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | yes | User email |
| password | string | yes | Minimum 8 characters |
| name | string | no | User name |

**201** — success:
```json
{
  "user": {
    "id": "64f...",
    "email": "user@example.com",
    "name": "John",
    "createdAt": "2026-02-23T12:00:00.000Z"
  },
  "expiresIn": 900
}
```

`expiresIn` — access token lifetime in seconds (default `900` = 15 min).

**400** — invalid data, **409** — email already taken.

---

### POST /auth/login

Sign in with email and password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```

**200** — success (response format same as register, includes `expiresIn`).

**401** — invalid email or password.

---

### POST /auth/refresh

Refresh the access token. The refresh token is read from cookies automatically. The old refresh token is revoked (rotation).

**Body:** empty (or `{}`)

**200** — success (response format same as register, includes `expiresIn`).

**401** — refresh token missing / invalid / revoked / expired.

---

### POST /auth/logout

Sign out. Revokes the refresh token in the database and clears cookies.

**Body:** not required.

**204** — success (no response body).

---

### GET /auth/me

Get the current user. Requires a valid access token cookie.

**200** — success:
```json
{
  "user": {
    "id": "64f...",
    "email": "user@example.com",
    "name": "John",
    "createdAt": "2026-02-23T12:00:00.000Z"
  }
}
```

**401** — unauthorized.

---

## OAuth

### GET /auth/google

Redirect to Google OAuth. Open in the browser.

**Query params:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| redirectPath | string | no | Where to redirect after sign-in (e.g. `/dashboard`) |

**302** — redirect to Google.

---

### GET /auth/google/callback

Callback from Google. Called automatically after authorization. Sets cookies and redirects to the frontend.

---

### GET /auth/facebook

Same as Google — redirect to Facebook OAuth.

---

### GET /auth/facebook/callback

Callback from Facebook. Same as Google callback.

---

### POST /auth/social

Verify a provider token directly (for mobile/SPA).

**Body:**
```json
{
  "provider": "google",
  "accessToken": "ya29.a0AfH6SM..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | yes | `google` or `facebook` |
| accessToken | string | yes | Access token from the provider |

**200** — success (response format same as register, includes `expiresIn`).

**400** — invalid params, **401** — invalid provider token.

---

## Dev-only: Custom Token TTL

> Only works when `NODE_ENV=development`. Ignored in production.

The `register`, `login`, and `refresh` endpoints accept optional parameters to override token lifetimes:

| Field | Type | Description |
|-------|------|-------------|
| accessExpiresIn | string | Access token TTL (`10s`, `5m`, `1h`, `2d`) |
| refreshExpiresIn | string | Refresh token TTL (`30s`, `10m`, `1h`, `7d`) |

**Example — login with 10-second access token:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "accessExpiresIn": "10s"
}
```

**Example — login with both custom TTLs:**
```json
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "accessExpiresIn": "5s",
  "refreshExpiresIn": "1m"
}
```

Defaults (without params): access — 15 minutes, refresh — 7 days.

---

## Error format

All errors are returned in the format:
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

## Cookies

The server automatically sets two HTTP-only cookies on successful authentication:

| Cookie | Description |
|--------|-------------|
| `access_token` | JWT, path `/` |
| `refresh_token` | JWT, path `/auth` |

The client must send requests with `withCredentials: true` (axios) or `credentials: 'include'` (fetch).
