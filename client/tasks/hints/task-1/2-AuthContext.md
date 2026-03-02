# AuthContext.tsx — контекст авторизації

> Файл: `src/AuthContext.tsx`

## Типи

```ts
User: { id: string, email: string, name: string }

AuthContextType: {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}
```

## Контекст та хук

- `const AuthContext = createContext<AuthContextType | null>(null)`
- `useAuth()` — повертає `AuthContextType`. Якщо використаний поза `AuthProvider` — кинути помилку.

## AuthProvider

**Пропси:** `{ children: React.ReactNode }`

**Стейт:**
- `user: User | null = null`
- `isLoading: boolean = true` — починаємо з `true`, бо ще не перевірили сесію

### `login(email, password)`

1. `POST /auth/login` з body `{ email, password }`
2. `const data = await res.json()` — повертає `{ user, expiresIn }`
3. `setUser(data.user)`

> Помилки НЕ ловимо тут — прокидаємо в компонент, щоб форма показала текст

### `register(email, password, name)`

Аналогічно login:
1. `POST /auth/register` з body `{ email, password, name }`
2. `const data = await res.json()` — повертає `{ user, expiresIn }`
3. `setUser(data.user)`

### `logout()`

1. `POST /auth/logout`
2. `setUser(null)`

### `useEffect` — перевірка сесії при маунті

Запускається один раз `[]`.

1. `GET /auth/me`
2. Якщо ok — `setUser(data)`
3. Якщо помилка — нічого (юзер не залогінений)
4. В будь-якому випадку (`finally`) — `setIsLoading(false)`

### return

```tsx
<AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
  {children}
</AuthContext.Provider>
```
