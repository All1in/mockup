import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';
import { connectDb, disconnectDb } from './db/database';
import { createUserRepository, createRefreshTokenRepository, createProviderAccountRepository } from './db/repositories';
import { AuthService } from './auth/auth.service';
import { createAuthRoutes } from './auth/auth.routes';
import { env } from './config/env';
import { seedDefaultUserIfNeeded } from './db/seed';
import { seedDashboardDataIfNeeded } from './dashboard/seed';
import cors from 'cors';
import { createApiRoutes } from './api/api.routes';
import { createFileRoutes } from './api/files.routes';
import { createStorage } from './storage';
import { createAuthMiddleware } from './auth/auth.middleware';
import { createDashboardRoutes } from './dashboard/dashboard.routes';
import {
  createPaymentEventRepository,
  createPaymentOrderRepository,
} from './payments/payment.repositories';
import { createStripePaymentGatewayFromEnv } from './payments/payment.gateway';
import { PaymentService } from './payments/payment.service';
import { DisabledPaymentController, PaymentController } from './payments/payment.controller';
import { createPaymentRoutes, createPaymentWebhookRoutes } from './payments/payment.routes';


const app = express();
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Кидає одразу, якщо сховище не налаштоване. Впасти на старті краще, ніж
// приймати реєстрації й падати на першому завантаженні файла.
const storage = createStorage();
const userRepo = createUserRepository();
const refreshTokenRepo = createRefreshTokenRepository();
const providerAccountRepo = createProviderAccountRepository();
const authService = new AuthService(userRepo, refreshTokenRepo);
const requireAuth = createAuthMiddleware(userRepo);
const paymentOrderRepo = createPaymentOrderRepository();
const paymentEventRepo = createPaymentEventRepository();
const paymentGateway = createStripePaymentGatewayFromEnv();
const paymentController = paymentGateway && env.STRIPE_PUBLISHABLE_KEY
  ? new PaymentController(
      new PaymentService(paymentOrderRepo, paymentEventRepo, paymentGateway),
      paymentGateway
    )
  : new DisabledPaymentController();

app.use('/payments/webhook', createPaymentWebhookRoutes(paymentController));
app.use(express.json());
app.use(cookieParser());

// Було: app.use('/uploads', express.static(process.cwd()/uploads)).
//
// Прибрано з двох причин, і друга серйозніша за першу. Диск контейнера
// ефемерний — після редеплою файли зникали, а посилання на них лишалися в БД.
// І роздавалася вся директорія без автентифікації: разом з аватарами туди
// потрапляли company_doc_*.pdf. Тепер файли лежать в об'єктному сховищі, а
// /files перевіряє права й видає короткоживуче підписане посилання.
app.use('/files', createFileRoutes(storage, requireAuth));

app.use('/api', createApiRoutes(userRepo, storage));
app.use('/api/dashboard', createDashboardRoutes(userRepo));
// Next.js rewrites "/api/*" -> BACKEND_URL/* (without the "/api" prefix),
// so dashboard is also mounted at "/dashboard" to work with the existing proxy setup.
app.use('/dashboard', createDashboardRoutes(userRepo));
app.use('/auth', createAuthRoutes(authService, userRepo, refreshTokenRepo, providerAccountRepo));
app.use('/payments', createPaymentRoutes(paymentController, userRepo));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

let server: import('http').Server | undefined;

async function start(): Promise<void> {
  await connectDb();

  // Сідер створює відомий акаунт test@example.com із паролем, який лежить у
  // відкритому коді. Для локальної розробки це зручність, у проді — готовий
  // вхід для будь-кого, хто читав репозиторій. У контейнері цей код
  // виконується на кожному старті, тому межу треба ставити явно.
  if (env.NODE_ENV !== 'production') {
    await seedDefaultUserIfNeeded(userRepo);
    await seedDashboardDataIfNeeded();
  } else {
    console.log('Seed skipped: NODE_ENV=production');
  }

  server = app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
}

/**
 * Коректна зупинка.
 *
 * SIGTERM — це те, що надсилає `docker stop` і будь-який оркестратор під час
 * деплою. Без обробника Node просто вмирає: запити в роботі обриваються,
 * з'єднання з Mongo лишається відкритим до таймауту на боці сервера.
 * SIGINT — те саме для Ctrl+C у терміналі.
 *
 * Порядок важливий: спершу перестаємо приймати нові з'єднання й дочікуємо
 * поточні, і лише потім рвемо базу. Навпаки — це обірвані запити, які вже
 * почали писати.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down`);

  // Страховка: якщо якийсь запит зависне, деплой не має чекати вічно.
  // Оркестратор усе одно вб'є контейнер через свій таймаут — краще вийти
  // самим і зрозуміло про це повідомити.
  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out after 10s, exiting forcefully');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('Shutdown failed', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
