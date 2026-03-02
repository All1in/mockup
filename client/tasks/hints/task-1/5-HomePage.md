# HomePage.tsx — головна сторінка

> Файл: `src/pages/HomePage.tsx`

## Імпорти

`useAuth`, `Link` з react-router-dom

## Дані

```ts
const { user, logout } = useAuth()
```

## JSX — два стани

**Якщо `user` є:**
```tsx
<h1>Привіт, {user.name}!</h1>
<p>Email: {user.email}</p>
<button onClick={logout}>Вийти</button>
```

**Якщо `user` немає:**
```tsx
<h1>Ласкаво просимо</h1>
<Link to="/login">Увійти</Link>
<Link to="/register">Зареєструватися</Link>
```
