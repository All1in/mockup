# LoginPage.tsx — сторінка логіну

> Файл: `src/pages/LoginPage.tsx`

## Імпорти

`useState`, `FormEvent` з React, `useAuth`, `Link` та `useNavigate` з react-router-dom

## Стейт

- `email: string = ''`
- `password: string = ''`
- `error: string = ''` — текст помилки від сервера

## `handleSubmit(e: FormEvent)`

1. `e.preventDefault()`
2. Очистити `error`
3. `await login(email, password)` — з `useAuth()`
4. Якщо успішно — `navigate('/', { replace: true })`
5. Якщо помилка — `setError(err.message)`

> Сервер повертає: `"Invalid email or password"` (401)

## JSX

```tsx
<form onSubmit={handleSubmit}>
  <h1>Увійти</h1>

  {error && <p style={{ color: 'red' }}>{error}</p>}

  <input type="email" value={email} onChange={...} placeholder="Email" required />
  <input type="password" value={password} onChange={...} placeholder="Пароль" required />

  <button type="submit">Увійти</button>

  <p>Немає акаунту? <Link to="/register">Зареєструватися</Link></p>
</form>
```
