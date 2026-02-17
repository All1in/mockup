# Mockup Server (Backend)

REST API на Node.js + Express + TypeScript з JWT-аутентифікацією та MongoDB.

## Стек

- **Runtime:** Node.js
- **Framework:** Express
- **Мова:** TypeScript
- **База даних:** MongoDB (Mongoose)
- **Аутентифікація:** JWT (access + refresh), HttpOnly cookies
- **Паролі:** bcrypt

## Вимоги

- Node.js 18+
- MongoDB (локальний кластер або Atlas)
- Змінні оточення (див. нижче)

## Встановлення та запуск

```bash
# Встановити залежності
npm install

# Розробка (hot reload з src/)
npm run dev

# Збірка та продакшн-запуск
npm run build
npm start
```

- **`npm run dev`** — запускає `src/index.ts` через ts-node-dev (папка `dist` не використовується).
- **`npm run build`** — компілює TypeScript у `dist/`.
- **`npm start`** — запускає `node dist/index.js` (потрібна попередня збірка).

## Змінні оточення

Створи файл `.env` у корені `server/` (або використовуй системні змінні):

| Змінна | Опис | Приклад |
|--------|------|---------|
| `PORT` | Порт сервера | `4000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `MONGO_URI` | URI підключення до MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_ACCESS_SECRET` | Секрет для access JWT (мін. 32 символи) | довгий випадковий рядок |
| `JWT_REFRESH_SECRET` | Секрет для refresh JWT (мін. 32 символи) | довгий випадковий рядок |

Можна скопіювати `.env.example` у `.env` і підставити свої значення.

## Структура проєкту

```
server/
├── src/
│   ├── config/
│   │   └── env.ts              # Конфіг змінних оточення
│   ├── db/
│   │   ├── database.ts         # Підключення MongoDB (mongoose)
│   │   ├── entities.ts         # Доменні типи (User, RefreshTokenRecord)
│   │   ├── repositories.ts     # Репозиторії (User, RefreshToken)
│   │   ├── seed.ts             # Seed тестового користувача
│   │   └── models/
│   │       ├── User.model.ts
│   │       └── RefreshToken.model.ts
│   ├── auth/
│   │   ├── auth.controller.ts  # Обробники запитів
│   │   ├── auth.service.ts     # Бізнес-логіка (login, register, refresh, logout)
│   │   ├── auth.routes.ts      # Маршрути /auth/*
│   │   ├── auth.middleware.ts  # Перевірка access JWT, req.user
│   │   └── token.service.ts    # JWT + cookies
│   ├── types/
│   │   └── express.d.ts        # Розширення Request (user)
│   └── index.ts                # Точка входу
├── dist/                       # Збірка (генерується npm run build)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## API

Базовий URL: `http://localhost:4000` (або твій `PORT`).

### Загальне

- **Content-Type:** запити з тілом — `application/json`.
- **Помилки:** тіло у форматі `{ "error": "...", "message": "..." }`.
- **Авторизація:** захищені маршрути використовують cookie `access_token` (HttpOnly) або заголовок `Authorization: Bearer <access_token>`.

---

### `GET /health`

Перевірка роботи сервера.

**Відповідь (200):**

```json
{ "status": "ok" }
```

---

### `POST /auth/register`

Реєстрація нового користувача. Після успіху встановлюються cookies (access + refresh), користувач вважається залогіненим.

**Тіло запиту:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Валідація:** email та password обовʼязкові; пароль — мінімум 8 символів. Email зберігається в lowercase.

**Успіх (201):**

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "createdAt": "2025-02-17T..."
  }
}
```

**Помилки:**  
- **400** — немає email/password або пароль закороткий.  
- **409** — користувач з таким email вже існує.

---

### `POST /auth/login`

Вхід. У відповіді — тіло з `user` та встановлені cookies (access + refresh).

**Тіло запиту:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Успіх (200):**

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "createdAt": "..."
  }
}
```

**Помилка (401):** невірний email або пароль.

---

### `POST /auth/refresh`

Оновлення пари токенів. Refresh token очікується в cookie `refresh_token` (path `/auth/refresh`). Після успіху видається нова пара токенів (ротація), старі інвалідуються.

**Успіх (200):** тіло як у login; нові cookies.

**Помилки (401):** відсутній/невірний/відозваний refresh token.

---

### `POST /auth/logout`

Вихід. Refresh token в БД позначається як відозваний, cookies очищаються.

**Успіх (204):** тіла немає.

---

### `GET /auth/me`

Поточний користувач. Потрібна авторизація (cookie `access_token` або `Authorization: Bearer ...`).

**Успіх (200):**

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "createdAt": "..."
  }
}
```

**Помилка (401):** немає/невірний access token або користувач не знайдений.

---

## Cookies

| Ім'я | Path | Термін | Опис |
|------|------|--------|------|
| `access_token` | `/` | 15 хв | JWT для доступу до API |
| `refresh_token` | `/auth/refresh` | 7 днів | JWT для оновлення пари токенів |

Властивості: `httpOnly`, `sameSite: 'strict'`, `secure` у production. Токени у тілі відповіді не повертаються — тільки в cookies.

## Seed

При першому запуску створюється тестовий користувач (якщо його ще немає):

- **Email:** `test@example.com`  
- **Пароль:** `Password123!`

Логін можливий через `POST /auth/login` або після реєстрації інших користувачів через `POST /auth/register`.

## Безпека

- Паролі зберігаються як bcrypt-хеш (12 раундів).
- Refresh token у БД зберігається лише у вигляді хешу (SHA-256).
- При кожному виклику `/auth/refresh` старий refresh token відкликається (ротація).
- Access token не зберігається в БД; перевірка лише за підписом JWT.
- У production обовʼязково встанови сильні та унікальні `JWT_ACCESS_SECRET` і `JWT_REFRESH_SECRET`.

## Ліцензія

Private / внутрішній проєкт.
