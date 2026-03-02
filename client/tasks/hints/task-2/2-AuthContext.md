# AuthContext.tsx — додати таймер

> Файл: `src/AuthContext.tsx` — змінити існуючий з задачі 1

## Додаткові імпорти

`useRef`, `useCallback` з React, `setOnUnauthorized` з `'./api'`

## Додати: реф для таймера

```ts
const refreshTimerRef = useRef<number | null>(null)
```

## Додати: `scheduleRefresh(expiresIn)`

**Параметри:** `expiresIn: number` — секунди до смерті access token (від сервера)

1. Очистити попередній: `clearTimeout(refreshTimerRef.current)`
2. Порахувати delay: `(expiresIn - 60) * 1000` мс (якщо `expiresIn <= 60` → мінімум `1000` мс)
3. Запустити таймер:
   ```ts
   refreshTimerRef.current = setTimeout(async () => {
     const res = await api('/auth/refresh', { method: 'POST' })
     const data = await res.json()  // { user, expiresIn }
     setUser(data.user)
     scheduleRefresh(data.expiresIn)  // рекурсивно
   }, delay)
   ```

## Додати: `clearRefreshTimer()`

1. `clearTimeout(refreshTimerRef.current)`
2. `refreshTimerRef.current = null`

## Змінити: `login()`

Після `setUser(data.user)` додати:
```ts
scheduleRefresh(data.expiresIn)
```

## Змінити: `register()`

Після `setUser(data.user)` додати:
```ts
scheduleRefresh(data.expiresIn)
```

## Змінити: `logout()`

Після `setUser(null)` додати:
```ts
clearRefreshTimer()
```

## Змінити: `useEffect` (маунт)

Додати реєстрацію колбека для розлогіну:
```ts
setOnUnauthorized(() => { setUser(null); clearRefreshTimer() })
```

Додати cleanup:
```ts
return () => clearRefreshTimer()
```
