# Задача 3: Неактивна вкладка і захист роутів (30 хв)

**Стек:** React + TypeScript, Vite, react-router-dom. Для HTTP — нативний `fetch`, ніяких axios.

## Мета

Браузер зупиняє `setTimeout` коли вкладка неактивна. Треба це обробити. Плюс захистити роути.

## Крок за кроком

### 1. Visibility change

- При старті таймера зберегти `tokenExpiresAt = Date.now() + expiresIn * 1000`
- Слухати `document.addEventListener('visibilitychange', ...)`
- Коли вкладка стала активною: якщо `Date.now() >= tokenExpiresAt` → зробити `POST /auth/refresh`

### 2. PrivateRoute

- Компонент-обгортка: перевіряє чи є `user`
- Є user → показати сторінку
- Нема user і `isLoading` → показати лоадер
- Нема user і не loading → редірект на `/login?returnTo=/поточний-url`

### 3. Return URL

- При редіректі на логін — додати `?returnTo=...` в URL
- Після успішного логіну — прочитати `returnTo` з URL і перейти туди

## Важливо

- `visibilitychange` — основний механізм для неактивних вкладок, не покладатись тільки на `setTimeout`
- Return URL зберігати в URL query параметрі, не в localStorage
- Якщо refresh впав — розлогін, без зациклення

## Тестування

Використай короткі TTL:

```json
POST /auth/login
{ "email": "test@example.com", "password": "Password123!", "accessExpiresIn": "10s", "refreshExpiresIn": "30s" }
```

Сценарій: залогінитись → перейти на іншу вкладку → почекати 15 сек → повернутися.

## Перевіряємо

- [ ] Вкладка неактивна 15+ сек → повернувся → все працює
- [ ] Обидва токени протухли → редірект на `/login`
- [ ] Відкрив захищену сторінку без логіну → потрапив на `/login?returnTo=...`
- [ ] Залогінився → автоматично потрапив на returnTo URL
- [ ] Поки йде перевірка сесії — бачу лоадер, а не миготіння
