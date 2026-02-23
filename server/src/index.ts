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
import cors from 'cors';


const app = express();
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const userRepo = createUserRepository();
const refreshTokenRepo = createRefreshTokenRepository();
const providerAccountRepo = createProviderAccountRepository();
const authService = new AuthService(userRepo, refreshTokenRepo);

app.use('/auth', createAuthRoutes(authService, userRepo, refreshTokenRepo, providerAccountRepo));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start(): Promise<void> {
  await connectDb();
  await seedDefaultUserIfNeeded(userRepo);
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
