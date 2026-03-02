# RegisterPage.tsx — сторінка реєстрації

> Файл: `src/pages/RegisterPage.tsx`

## Імпорти

`useState`, `FormEvent` з React, `useAuth`, `Link` та `useNavigate` з react-router-dom

## Стейт

- `name: string = ''`
- `email: string = ''`
- `password: string = ''`
- `error: string = ''`

## `handleSubmit(e: FormEvent)`

1. `e.preventDefault()`
2. Очистити `error`
3. `await register(email, password, name)` — з `useAuth()`
4. Якщо успішно — `navigate('/', { replace: true })`
5. Якщо помилка — `setError(err.message)`

> Сервер повертає: `"Email already taken"` (409), `"Password must be at least 8 characters..."` (400)

## JSX

```tsx
<form onSubmit={handleSubmit}>
  <h1>Реєстрація</h1>

  {error && <p style={{ color: 'red' }}>{error}</p>}

  <input type="text" value={name} onChange={...} placeholder="Ім'я" required />
  <input type="email" value={email} onChange={...} placeholder="Email" required />
  <input type="password" value={password} onChange={...} placeholder="Пароль" required />

  <button type="submit">Зареєструватися</button>

  <p>Вже є акаунт? <Link to="/login">Увійти</Link></p>
</form>
```
