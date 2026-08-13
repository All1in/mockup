/**
 * Тести маршруту видачі файлів.
 *
 * Існують через конкретний баг: маршрут був оголошений як `/*key` — синтаксис
 * Express 5 — тоді як у проєкті Express 4, де це означає «будь-що, а потім
 * літеральний текст key». Ендпоінт відповідав 404 на кожен реальний запит, а
 * тести сховища цього не бачили, бо перевіряли шар нижче.
 *
 * Звідси й межа: тут не перевіряється S3. Сховище підмінене, предмет
 * перевірки — маршрутизація і рішення про доступ.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createFileRoutes } from './files.routes';
import type { FileStorage } from '../storage';
import type { User } from '../db/entities';

const OWN_KEY = 'avatars/0707a456-8e7c-401b-a8f2-7cd44cb40fd4.png';
const OTHER_KEY = 'company-docs/11111111-2222-3333-4444-555555555555.pdf';

const user: User = {
  id: 'u1',
  email: 'test@example.com',
  passwordHash: 'x',
  avatarUrl: OWN_KEY,
  createdAt: new Date(),
};

function makeStorage(overrides: Partial<FileStorage> = {}): FileStorage {
  return {
    put: async () => 'unused',
    signedUrl: async (key) => `https://storage.example/${key}?sig=abc`,
    delete: async () => undefined,
    exists: async () => true,
    ...overrides,
  };
}

/** Піднімає застосунок на випадковому порту і повертає базовий URL + close. */
// null, а не undefined: явно передане undefined у JS активує значення за
// замовчуванням, тож «анонімний» виклик мовчки отримував би користувача.
async function serve(storage: FileStorage, asUser: User | null = user) {
  const app = express();
  const requireAuth: express.RequestHandler = (req, _res, next) => {
    req.user = asUser ?? undefined;
    next();
  };
  app.use('/files', createFileRoutes(storage, requireAuth));

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

describe('GET /files/:scope/:name', () => {
  test('власний файл → 302 на підписане посилання', async () => {
    const s = await serve(makeStorage());
    try {
      // redirect: 'manual' обов'язковий — інакше fetch піде за 302 на
      // неіснуючий storage.example і ми перевіримо не те.
      const res = await fetch(`${s.url}/files/${OWN_KEY}`, { redirect: 'manual' });

      assert.equal(res.status, 302);
      assert.equal(res.headers.get('location'), `https://storage.example/${OWN_KEY}?sig=abc`);
      // Без no-store проміжний кеш віддавав би підписане посилання й після
      // того, як права змінились.
      assert.equal(res.headers.get('cache-control'), 'no-store');
    } finally {
      await s.close();
    }
  });

  test('власний документ компанії → 302', async () => {
    // Друга гілка перевірки власності (companyDocumentUrl) — окремим тестом.
    // Саме документи компаній є справді приватними, і помилка в цій гілці
    // коштує дорожче за помилку з аватаром.
    const owner: User = { ...user, avatarUrl: undefined, companyDocumentUrl: OTHER_KEY };
    const s = await serve(makeStorage(), owner);
    try {
      const res = await fetch(`${s.url}/files/${OTHER_KEY}`, { redirect: 'manual' });
      assert.equal(res.status, 302);
      assert.equal(res.headers.get('location'), `https://storage.example/${OTHER_KEY}?sig=abc`);
    } finally {
      await s.close();
    }
  });

  test('чужий файл → 404, а не 403', async () => {
    const s = await serve(makeStorage());
    try {
      const res = await fetch(`${s.url}/files/${OTHER_KEY}`, { redirect: 'manual' });
      // 403 підтвердив би існування об'єкта й зробив ендпоінт оракулом для
      // перебору чужих ключів.
      assert.equal(res.status, 404);
    } finally {
      await s.close();
    }
  });

  test('ключ неприпустимої форми → 400 і сховище не викликається', async () => {
    let called = false;
    const s = await serve(
      makeStorage({
        signedUrl: async () => {
          called = true;
          return 'nope';
        },
      }),
    );
    try {
      for (const bad of ['avatars/not-a-uuid.png', 'backups/dump.pdf']) {
        const res = await fetch(`${s.url}/files/${bad}`, { redirect: 'manual' });
        assert.equal(res.status, 400, bad);
      }
      assert.equal(called, false, 'форма ключа має перевірятись до звернення в сховище');
    } finally {
      await s.close();
    }
  });

  test('без користувача → 401', async () => {
    const s = await serve(makeStorage(), null);
    try {
      const res = await fetch(`${s.url}/files/${OWN_KEY}`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    } finally {
      await s.close();
    }
  });

  test('сховище недоступне → 502, процес живий', async () => {
    const s = await serve(
      makeStorage({
        signedUrl: async () => {
          throw new Error('connect ECONNREFUSED');
        },
      }),
    );
    try {
      const res = await fetch(`${s.url}/files/${OWN_KEY}`, { redirect: 'manual' });
      // Express 4 не ловить помилки async-хендлерів: без try/catch це був би
      // unhandled rejection, а в Node 22 — падіння процесу.
      assert.equal(res.status, 502);
    } finally {
      await s.close();
    }
  });
});
