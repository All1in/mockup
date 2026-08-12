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
import path from 'path';
import { createApiRoutes } from './api/api.routes';
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

const userRepo = createUserRepository();
const refreshTokenRepo = createRefreshTokenRepository();
const providerAccountRepo = createProviderAccountRepository();
const authService = new AuthService(userRepo, refreshTokenRepo);
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

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', createApiRoutes(userRepo));
app.use('/api/dashboard', createDashboardRoutes(userRepo));
// Next.js rewrites "/api/*" -> BACKEND_URL/* (without the "/api" prefix),
// so dashboard is also mounted at "/dashboard" to work with the existing proxy setup.
app.use('/dashboard', createDashboardRoutes(userRepo));
app.use('/auth', createAuthRoutes(authService, userRepo, refreshTokenRepo, providerAccountRepo));
app.use('/payments', createPaymentRoutes(paymentController, userRepo));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start(): Promise<void> {
  await connectDb();
  await seedDefaultUserIfNeeded(userRepo);
  await seedDashboardDataIfNeeded();
  app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
}

process.on('SIGINT', async () => {
  await disconnectDb();
  process.exit(0);
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
