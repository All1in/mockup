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
| `FRONTEND_URL` | URL фронту (редирект після OAuth, **CORS origin** для credentials) | `http://localhost:3000` |
| `API_BASE_URL` | Базовий URL бекенду для OAuth callback (production) | `https://api.example.com` |
| `OAUTH_STATE_SECRET` | Секрет для підпису state (OAuth CSRF) | довгий випадковий рядок |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 | з Google Cloud Console |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook Login | з Meta for Developers |

Можна скопіювати `.env.example` у `.env` і підставити свої значення.

## API

Повна документація API: [documentation/api.md](../documentation/api.md).

## Seed

При першому запуску створюється тестовий користувач (якщо його ще немає):

- **Email:** `test@example.com`
- **Пароль:** `Password123!`

## Безпека

- Паролі зберігаються як bcrypt-хеш (12 раундів).
- Refresh token у БД зберігається лише у вигляді хешу (SHA-256).
- При кожному виклику `/auth/refresh` старий refresh token відкликається (ротація).
- Access token не зберігається в БД; перевірка лише за підписом JWT.
- У production обовʼязково встанови сильні та унікальні `JWT_ACCESS_SECRET` і `JWT_REFRESH_SECRET`.

## Ліцензія

Private / внутрішній проєкт.
