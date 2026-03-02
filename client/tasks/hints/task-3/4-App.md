# App.tsx — додати PrivateRoute

> Файл: `src/App.tsx` — змінити існуючий з задачі 1

## Додатковий імпорт

`PrivateRoute` з `'./components/PrivateRoute'`

## Змінити: роутінг

```tsx
<AuthProvider>
  <Routes>
    {/* Публічні роути — доступні всім */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Захищені роути — тільки для залогінених */}
    <Route element={<PrivateRoute />}>
      <Route path="/" element={<HomePage />} />
    </Route>
  </Routes>
</AuthProvider>
```

> `Route` без `path` з `element={<PrivateRoute />}` — це layout route. Вкладені роути спочатку проходять через `PrivateRoute`, який або показує `<Outlet />`, або редіректить на `/login`.

## Фінальна структура файлів

```
src/
├── api.ts                  — fetch-обгортка, refreshPromise, 401
├── AuthContext.tsx          — провайдер, таймер, visibilitychange
├── App.tsx                  — роутінг з PrivateRoute
├── App.css
├── main.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx        — + returnTo
│   └── RegisterPage.tsx
└── components/
    └── PrivateRoute.tsx     — guard
```
