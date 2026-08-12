import { Router } from 'express';
import type { IUserRepository } from '../db/repositories';
import { isInnInRegistry } from './innRegistry';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidInnFormat(inn: string): boolean {
  return /^\d{8}$/.test(inn) || /^\d{10}$/.test(inn);
}

function isLettersOnly(value: string): boolean {
  return /^[\p{L}]+$/u.test(value);
}

function isValidEmailFormat(email: string): boolean {
  // Intentionally simple: enough for UX + server-side sanity.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordMeetsRules(password: string): boolean {
  if (password.length < 8) return false;
  if (!/\d/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  return true;
}

function isAtLeastYearsOld(date: Date, years: number): boolean {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setFullYear(now.getFullYear() - years);
  return date <= threshold;
}

async function ensureUploadsDir(): Promise<string> {
  const dir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function extForMime(mime: string): string | null {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'application/pdf') return '.pdf';
  return null;
}

async function saveUploadToDisk(file: Express.Multer.File, prefix: string): Promise<string> {
  const uploadsDir = await ensureUploadsDir();
  const ext = extForMime(file.mimetype);
  if (!ext) {
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }
  const name = `${prefix}_${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(uploadsDir, name), file.buffer);
  return `/uploads/${name}`;
}

export function createApiRoutes(userRepo: IUserRepository): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // hard upper bound; we still validate per-field below
  });

  router.get('/check-email', async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    if (!email) {
      res.status(400).json({ error: 'Bad Request', message: 'email query param required' });
      return;
    }
    const normalized = normalizeEmail(email);
    const existing = await userRepo.findByEmail(normalized);
    res.status(200).json({ available: !existing });
  });

  router.get('/check-inn', async (req, res) => {
    const inn = typeof req.query.inn === 'string' ? req.query.inn.trim() : '';
    if (!inn) {
      res.status(400).json({ error: 'Bad Request', message: 'inn query param required' });
      return;
    }
    if (!isValidInnFormat(inn)) {
      // Requirement: request should be made only for 8 or 10 digits; but if it comes anyway — return valid:false.
      res.status(200).json({ valid: false });
      return;
    }
    res.status(200).json({ valid: isInnInRegistry(inn) });
  });

  router.post(
    '/register',
    upload.fields([
      { name: 'avatar', maxCount: 1 },
      { name: 'companyDocument', maxCount: 1 },
    ]),
    async (req, res) => {
      const body = req.body as Record<string, unknown>;

      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
      const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
      const accountType = body.accountType === 'personal' || body.accountType === 'business' ? body.accountType : undefined;

      if (!firstName || firstName.length < 2 || !isLettersOnly(firstName)) {
        res.status(400).json({ error: "Ім'я некоректне", field: 'firstName' });
        return;
      }
      if (!lastName || lastName.length < 2 || !isLettersOnly(lastName)) {
        res.status(400).json({ error: 'Прізвище некоректне', field: 'lastName' });
        return;
      }
      if (!email || !isValidEmailFormat(email)) {
        res.status(400).json({ error: 'Некоректний email', field: 'email' });
        return;
      }
      if (!passwordMeetsRules(password)) {
        res.status(400).json({ error: 'Пароль не відповідає вимогам', field: 'password' });
        return;
      }
      if (confirmPassword !== password) {
        res.status(400).json({ error: 'Паролі не співпадають', field: 'confirmPassword' });
        return;
      }
      if (!accountType) {
        res.status(400).json({ error: 'Оберіть тип акаунту', field: 'accountType' });
        return;
      }

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const avatar = files?.avatar?.[0];
      const companyDocument = files?.companyDocument?.[0];

      let avatarUrl: string | undefined;
      if (avatar) {
        const okMime = avatar.mimetype === 'image/jpeg' || avatar.mimetype === 'image/png';
        const okSize = avatar.size <= 2 * 1024 * 1024;
        if (!okMime || !okSize) {
          res.status(400).json({ error: 'Аватар: тільки jpg/png до 2MB', field: 'avatar' });
          return;
        }
        avatarUrl = await saveUploadToDisk(avatar, 'avatar');
      }

      let companyDocumentUrl: string | undefined;
      if (accountType === 'business') {
        if (!companyDocument) {
          res.status(400).json({ error: 'Документ компанії обовʼязковий', field: 'companyDocument' });
          return;
        }
        const okMime = companyDocument.mimetype === 'application/pdf';
        const okSize = companyDocument.size <= 5 * 1024 * 1024;
        if (!okMime || !okSize) {
          res.status(400).json({ error: 'Документ: тільки PDF до 5MB', field: 'companyDocument' });
          return;
        }
        companyDocumentUrl = await saveUploadToDisk(companyDocument, 'company_doc');
      }

      let birthDate: Date | undefined;
      let companyName: string | undefined;
      let inn: string | undefined;

      if (accountType === 'personal') {
        const birthDateRaw = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';
        const date = birthDateRaw ? new Date(birthDateRaw) : null;
        if (!date || Number.isNaN(date.getTime())) {
          res.status(400).json({ error: 'Некоректна дата народження', field: 'birthDate' });
          return;
        }
        if (!isAtLeastYearsOld(date, 18)) {
          res.status(400).json({ error: 'Потрібно бути 18+', field: 'birthDate' });
          return;
        }
        birthDate = date;
      } else {
        companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
        const innRaw = typeof body.inn === 'string' ? body.inn.trim() : '';

        if (!companyName || companyName.length < 2) {
          res.status(400).json({ error: 'Назва компанії некоректна', field: 'companyName' });
          return;
        }
        if (!isValidInnFormat(innRaw)) {
          res.status(400).json({ error: 'ІПН/ЄДРПОУ має бути 8 або 10 цифр', field: 'inn' });
          return;
        }
        if (!isInnInRegistry(innRaw)) {
          res.status(400).json({ error: 'Код не знайдено в реєстрі', field: 'inn' });
          return;
        }
        inn = innRaw;
      }

      const normalized = normalizeEmail(email);
      const existing = await userRepo.findByEmail(normalized);
      if (existing) {
        res.status(409).json({ error: 'Email вже зайнятий', field: 'email' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await userRepo.create({
        email: normalized,
        passwordHash,
        firstName,
        lastName,
        accountType,
        birthDate,
        companyName,
        inn,
        avatarUrl,
        companyDocumentUrl,
        name: `${firstName} ${lastName}`.trim(),
      });

      res.status(201).json({ userId: user.id });
    }
  );

  return router;
}

