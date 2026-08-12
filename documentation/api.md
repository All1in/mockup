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

## Payments

Stripe payments work in sandbox/test mode when `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` are configured. Without these variables, `/payments/config` returns `paymentsEnabled: false`, and write endpoints return **503**.

### GET /payments/config

Returns public Stripe checkout configuration.

**200** — enabled:
```json
{
  "paymentsEnabled": true,
  "publishableKey": "pk_test_..."
}
```

**200** — disabled:
```json
{
  "paymentsEnabled": false,
  "publishableKey": null
}
```

---

### POST /payments/intents

Creates or retrieves a Stripe PaymentIntent for the authenticated user. Requires a valid access token cookie.

**Body:**
```json
{
  "amount": 1999,
  "currency": "usd",
  "idempotencyKey": "checkout:7f4e8d7a-4b2b-4f5a-92fb-0b8e4c7dbe21",
  "description": "Mockup Pro subscription",
  "metadata": {
    "product": "mockup_pro"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | integer | yes | Smallest currency unit. Example: `1999` = `$19.99`. |
| currency | string | yes | Supported: `usd`, `eur`, `uah`. |
| idempotencyKey | string | yes | Stable per checkout attempt. Reuse returns the same order/intent if params match. |
| description | string | no | Max 200 chars. |
| metadata | object | no | String values only; do not send PII. |

**201** — success:
```json
{
  "order": {
    "id": "66f...",
    "amount": 1999,
    "currency": "usd",
    "status": "requires_payment_method",
    "description": "Mockup Pro subscription",
    "createdAt": "2026-06-02T12:00:00.000Z",
    "updatedAt": "2026-06-02T12:00:00.000Z"
  },
  "clientSecret": "pi_..._secret_...",
  "publishableKey": "pk_test_..."
}
```

**400** — invalid payment request, **401** — unauthorized, **409** — idempotency key reused with different amount/currency, **503** — payments not configured.

---

### GET /payments/orders/:orderId

Returns the current local order status for the authenticated user. If the order has a non-terminal Stripe PaymentIntent, the server first refreshes status from Stripe.

**200** — success:
```json
{
  "order": {
    "id": "66f...",
    "amount": 1999,
    "currency": "usd",
    "status": "succeeded",
    "paidAt": "2026-06-02T12:03:00.000Z",
    "createdAt": "2026-06-02T12:00:00.000Z",
    "updatedAt": "2026-06-02T12:03:00.000Z"
  }
}
```

**401** — unauthorized, **404** — order not found, **503** — payments not configured.

---

### POST /payments/webhook

Stripe webhook endpoint. This route expects the raw request body and verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`.

Recommended events:

| Event | Purpose |
|-------|---------|
| `payment_intent.succeeded` | Mark order as paid. |
| `payment_intent.payment_failed` | Store failure details and keep order retryable. |
| `payment_intent.processing` | Mark async method as processing. |
| `payment_intent.requires_action` | Keep order waiting for customer action / 3DS. |
| `payment_intent.canceled` | Mark order as canceled. |

**200** — processed or duplicate event ignored:
```json
{
  "processed": true,
  "eventId": "evt_...",
  "type": "payment_intent.succeeded"
}
```

**400** — invalid signature, **500** — local order not found for a known PaymentIntent metadata id, **503** — payments not configured.

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
