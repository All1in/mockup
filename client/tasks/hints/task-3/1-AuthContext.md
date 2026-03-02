# AuthContext.tsx — додати visibility change

> Файл: `src/AuthContext.tsx` — змінити існуючий з задачі 2

## Додати: реф для часу протухання

```ts
const tokenExpiresAtRef = useRef<number>(0)
```

## Змінити: `scheduleRefresh(expiresIn)`

Після `clearTimeout` додати:
```ts
tokenExpiresAtRef.current = Date.now() + expiresIn * 1000
```

## Змінити: `clearRefreshTimer()`

Додати:
```ts
tokenExpiresAtRef.current = 0
```

## Додати: новий `useEffect` — visibilitychange

**Навіщо:** браузер зупиняє `setTimeout` коли вкладка неактивна. Таймер на refresh міг не спрацювати. При поверненні — перевіряємо вручну.

```ts
const handleVisibilityChange = () => {
  if (document.visibilityState !== 'visible') return
  if (tokenExpiresAtRef.current === 0) return        // юзер не залогінений
  if (Date.now() < tokenExpiresAtRef.current) return  // токен ще живий

  // Токен протух поки вкладка була неактивна
  api('/auth/refresh', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      setUser(data.user)
      scheduleRefresh(data.expiresIn)
    })
    .catch(() => {
      setUser(null)
      clearRefreshTimer()
    })
}

document.addEventListener('visibilitychange', handleVisibilityChange)
return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
```
