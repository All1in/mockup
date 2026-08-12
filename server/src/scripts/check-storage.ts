/**
 * Наскрізна перевірка сховища: покласти → підписати → скачати → звірити → видалити.
 *
 *   npm run check:storage
 *
 * Навіщо окремий скрипт, якщо є тести: тести ходять у MinIO і відповідають на
 * питання «чи правильний наш код». Цей скрипт ходить туди, що записано в .env,
 * і відповідає на інше питання — «чи правильно налаштоване це конкретне
 * середовище». Помилка в endpoint, регіоні чи правах токена виглядає як
 * зламаний застосунок, хоча код бездоганний.
 *
 * Нічого після себе не лишає: тестовий об'єкт видаляється в finally.
 */

import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';
import { env } from '../config/env';
import { createStorage } from '../storage';

function mask(secret: string): string {
  if (!secret) return '(порожньо)';
  return `${secret.slice(0, 4)}…${secret.slice(-2)} (${secret.length} символів)`;
}

async function main(): Promise<void> {
  console.log('Налаштування:');
  console.log(`  bucket          ${env.STORAGE_BUCKET}`);
  console.log(`  endpoint        ${env.STORAGE_ENDPOINT || '(AWS S3 за замовчуванням)'}`);
  console.log(`  region          ${env.STORAGE_REGION}`);
  console.log(`  path-style      ${env.STORAGE_FORCE_PATH_STYLE}`);
  console.log(`  access key      ${mask(env.STORAGE_ACCESS_KEY_ID)}`);
  console.log(`  secret key      ${mask(env.STORAGE_SECRET_ACCESS_KEY)}`);
  console.log('');

  const storage = createStorage();
  const payload = crypto.randomBytes(1024);
  const name = `${crypto.randomUUID()}.png`;
  let key: string | undefined;

  try {
    key = await storage.put({
      scope: 'avatars',
      name,
      body: payload,
      contentType: 'image/png',
    });
    console.log(`1. Покладено      ${key}`);

    const exists = await storage.exists(key);
    if (!exists) throw new Error('put відпрацював, але exists каже, що об\'єкта немає');
    console.log('2. Exists         підтвердив наявність');

    const url = await storage.signedUrl(key, 60);
    console.log(`3. Підписано      ${url.split('?')[0]}?…`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Скачування дало ${res.status} ${res.statusText}`);
    const received = Buffer.from(await res.arrayBuffer());
    if (!received.equals(payload)) {
      throw new Error(`Байти не збігаються: поклали ${payload.length}, отримали ${received.length}`);
    }
    console.log(`4. Скачано        ${received.length} байт, збігається побайтово`);

    // Той самий URL без підпису має бути відхилений — інакше бакет публічний,
    // і вся перевірка прав у /files не має сенсу.
    const unsigned = await fetch(url.split('?')[0]);
    if (unsigned.ok) {
      console.log('');
      console.log('УВАГА: об\'єкт доступний БЕЗ підпису. Бакет публічний.');
      console.log('Зроби його приватним — інакше документи компаній читає будь-хто.');
    } else {
      console.log(`5. Без підпису    ${unsigned.status} — бакет приватний`);
    }

    console.log('');
    console.log('Сховище налаштоване правильно.');
  } finally {
    if (key) {
      await storage.delete(key).catch(() => undefined);
      console.log(`6. Прибрано       ${key}`);
    }
  }
}

main().catch((err) => {
  console.error('');
  console.error('Перевірка не пройшла:', err instanceof Error ? err.message : err);
  console.error('');
  console.error('Найчастіші причини:');
  console.error('  • у STORAGE_ENDPOINT вказано URL разом із назвою бакета —');
  console.error('    треба лише https://<account-id>.r2.cloudflarestorage.com');
  console.error('  • бакет із таким іменем не створений');
  console.error('  • у токена немає прав Object Read & Write');
  process.exit(1);
});
