# api.ts — додати refresh-логіку

> Файл: `src/api.ts` — змінити існуючий з задачі 1

## Додати: `refreshPromise`

Змінна на рівні модуля.

- **Тип:** `Promise<Response> | null`
- **Початкове значення:** `null`

**Навіщо:** якщо 3 запити одночасно отримали 401, без черги кожен відправить свій `POST /auth/refresh` — а треба лише один.

**Логіка:**
- Перший 401 → `refreshPromise = doRefresh()`
- Другий/третій 401 → бачать що `refreshPromise !== null` → чекають його
- Коли refresh завершився → `refreshPromise = null`

## Додати: `onUnauthorized`

Змінна на рівні модуля.

- **Тип:** `(() => void) | null`
- **Початкове значення:** `null`

**Навіщо:** коли refresh впав, треба очистити user в AuthContext. Але `api.ts` не знає про React-стейт.

**Рішення:** AuthContext при маунті реєструє колбек:
```ts
setOnUnauthorized(() => { setUser(null); clearRefreshTimer() })
```

**Експортувати:**
```ts
export function setOnUnauthorized(cb: () => void)
```

## Додати: `doRefresh()`

Не приймає аргументів. Повертає `Promise<Response>`.

1. `fetch(BASE_URL + '/auth/refresh', { method: 'POST', credentials: 'include' })`
2. Якщо `ok` — повернути response
3. Якщо помилка — викликати `onUnauthorized()`, кинути помилку

> Ця функція НЕ перевіряє `refreshPromise` — це робить `api()`

## Змінити: `api()` — обробка 401

Між перевіркою `response.ok` і кидком помилки додати:

Якщо `response.status === 401`:
1. Якщо `endpoint === '/auth/refresh'` — **НЕ ретраїти** (інакше зациклення!)
2. Якщо `refreshPromise === null` → `refreshPromise = doRefresh()`; інакше — використати існуючий
3. `try { await refreshPromise } catch { throw error }`
4. `finally { refreshPromise = null }`
5. Повторити оригінальний запит: `return fetch(url, mergedOptions)`

Інші помилки (400, 409...) — як і раніше, кинути `Error` з `data.message`.
