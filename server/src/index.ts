import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
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

/**
 * Прапорець «ми зупиняємось». Читається readiness-перевіркою.
 *
 * Між моментом, коли прийшов SIGTERM, і моментом, коли балансувальник
 * перестане слати сюди трафік, минає час. Доки він не минув, нові запити
 * продовжують приходити — і їх треба обслуговувати, а не обривати. Але
 * readiness має вже казати «не готовий», щоб цей час був якомога коротшим.
 */
let shuttingDown = false;

/**
 * Скільки продовжувати обслуговувати запити після SIGTERM, перш ніж закривати
 * сокет. Має бути ≥ інтервалу readiness-перевірки балансувальника, інакше він
 * ще шле трафік у застосунок, який уже закрився.
 *
 * У fly.toml інтервал 15 с, тому за замовчуванням 5 с — компроміс між
 * безпекою й швидкістю деплою. Локально нуль: чекати нема кого.
 */
const DRAIN_DELAY_MS = parseInt(process.env.SHUTDOWN_DRAIN_MS ?? '0', 10);

/** Загальна межа зупинки. Має бути меншою за kill_timeout платформи. */
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS ?? '15000', 10);

/**
 * Liveness: чи не завис процес.
 *
 * НЕ перевіряє базу — і це головне рішення в цьому файлі. Якщо liveness
 * залежатиме від Mongo, то моргання бази на 30 секунд зробить «мертвими»
 * ВСІ інстанси одночасно, оркестратор перезапустить їх усі, і замість
 * тридцятисекундної деградації ти отримаєш повну недоступність плюс
 * холодний старт. Це класичний каскадний збій: перевірка сама стає
 * причиною аварії.
 *
 * Правило: liveness відповідає лише на питання «чи допоможе перезапуск».
 * Недоступна база перезапуском не лікується.
 */
app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Readiness: чи можна слати сюди трафік.
 *
 * Ось тут база доречна: без неї застосунок відповідатиме помилками, тож
 * краще, щоб балансувальник обходив цей інстанс стороною. Перезапускати
 * при цьому нічого не треба — інстанс сам повернеться в стрій.
 *
 * readyState 1 — це «connected» у mongoose.
 */
app.get('/health/ready', (_req, res) => {
  if (shuttingDown) {
    res.status(503).json({ status: 'shutting_down' });
    return;
  }
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'db_unavailable' });
});

// Сумісність: старий шлях лишається як liveness. Прибрати можна буде, коли
// жоден конфіг (fly.toml, docker-compose, Dockerfile) на нього не посилається.
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
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, draining`);

  // Страховка: якщо якийсь запит зависне, деплой не має чекати вічно.
  // Оркестратор усе одно вб'є контейнер через свій таймаут — краще вийти
  // самим і зрозуміло про це повідомити.
  const forceExit = setTimeout(() => {
    console.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, exiting forcefully`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // ── Фаза 1: чекаємо, доки балансувальник нас прибере ─────────────────
    //
    // Найменш очевидна частина всієї зупинки. SIGTERM приходить у контейнер
    // РАНІШЕ, ніж балансувальник дізнається, що цей інстанс іде. Кілька
    // секунд він ще шле сюди новий трафік. Якщо в цю мить закрити сокет,
    // користувач отримає 502 — рівно під час деплою, коли все нібито
    // «без простою».
    //
    // Тому: readiness уже віддає 503 (shuttingDown = true), а сокет ще
    // відкритий і запити обслуговуються. Пауза має покривати інтервал
    // readiness-перевірки балансувальника.
    if (DRAIN_DELAY_MS > 0) {
      console.log(`Draining: refusing readiness for ${DRAIN_DELAY_MS}ms before closing`);
      await new Promise((resolve) => setTimeout(resolve, DRAIN_DELAY_MS));
    }

    // ── Фаза 2: закриваємо сервер ────────────────────────────────────────
    if (server) {
      // server.close() перестає приймати НОВІ з'єднання, але чекає, доки
      // закриються всі наявні — включно з idle keep-alive, які нічого не
      // роблять. Браузер тримає їх до хвилини, тож close() без цього рядка
      // просто висить до примусового виходу.
      //
      // closeIdleConnections рубає саме простійні, не чіпаючи ті, де зараз
      // виконується запит.
      server.closeIdleConnections();

      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
    }

    // ── Фаза 3: тепер відпускаємо базу ───────────────────────────────────
    await disconnectDb();
    console.log('Shutdown complete');
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
