# api.ts — обгортка над fetch

> Файл: `src/api.ts`

## Базовий URL

Береться з `.env` файлу через `import.meta.env.VITE_API_URL`.

```
VITE_API_URL=http://localhost:4000
```

## Функція `api(endpoint, options?)`

Єдина функція для всіх запитів до бекенду.

**Параметри:**
- `endpoint: string` — шлях без базового URL, наприклад `'/auth/login'`
- `options?: RequestInit` — стандартні опції fetch (`method`, `body`, `headers`...)

**Повертає:** `Promise<Response>`

**Що робить:**
1. Зібрати URL: `BASE_URL + endpoint`
2. Змержити `options` з дефолтами:
   - `credentials: 'include'` — **обов'язково**, інакше cookies не літають
   - `headers: { 'Content-Type': 'application/json', ...options.headers }`
3. Зробити `fetch(url, mergedOptions)`
4. Якщо `response.ok` — повернути response
5. Якщо помилка — дістати текст і кинути Error:
   ```ts
   const data = await response.json()
   throw new Error(data.message)
   ```

> Формат помилок від сервера: `{ message: "Email already taken" }`

## Приклади використання

**Логін:**
```ts
const res = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
const data = await res.json()
// data = { user: { id, email, name }, expiresIn: 900 }
```

**Перевірка сесії:**
```ts
const res = await api('/auth/me')
const data = await res.json()
// data = { id, email, name }
```

**Логаут:**
```ts
await api('/auth/logout', { method: 'POST' })
```
