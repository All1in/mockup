# PrivateRoute.tsx — захист роутів

> Новий файл: `src/components/PrivateRoute.tsx`

## Імпорти

`useAuth`, `Navigate`, `useLocation`, `Outlet` з react-router-dom

## Дані

```ts
const { user, isLoading } = useAuth()
const location = useLocation()
```

## Логіка — 3 стани

**1. `isLoading === true`**
→ Показати лоадер (`<p>Завантаження...</p>` або спінер)

> Навіщо: поки йде `GET /auth/me`, не знаємо чи юзер залогінений. Без цього буде миготіння логін-сторінки.

**2. `user === null`**
→ `<Navigate to={'/login?returnTo=' + location.pathname} replace />`

> Навіщо: зберігаємо куди юзер хотів потрапити.

**3. `user` є**
→ `<Outlet />` — показати вкладений роут
