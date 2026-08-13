/**
 * Інтеграційні тести сховища проти справжнього S3-сумісного сервера (MinIO).
 *
 * Навмисно НЕ юніт-тести з мокнутим S3-клієнтом. Мок підтвердив би лише те, що
 * ми викликаємо ті методи, які самі й вирішили викликати, — тобто перевіряв би
 * власні припущення. Усе, що тут реально може зламатись, живе на межі з
 * сервером: підпис URL, path-style адресація, форма помилки 404, кодування
 * ключа. Мок кожну з цих речей імітує, а не відтворює.
 *
 * Потрібен піднятий MinIO:  docker compose up -d minio minio-init
 * Запуск:                   npm test  (у server/)
 */

import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { S3Storage } from './s3.storage';
import { buildObjectName, isServableKey } from './index';

const storage = new S3Storage({
  bucket: process.env.STORAGE_BUCKET ?? 'mockup-uploads',
  region: process.env.STORAGE_REGION ?? 'auto',
  endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? 'minioadmin',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? 'minioadmin',
  forcePathStyle: true,
});

const created: string[] = [];

async function putFixture(bytes: Buffer, contentType = 'image/png'): Promise<string> {
  const key = await storage.put({
    scope: 'avatars',
    name: buildObjectName(contentType),
    body: bytes,
    contentType,
  });
  created.push(key);
  return key;
}

before(async () => {
  // Якщо MinIO не піднятий, хай тест впаде тут із зрозумілим повідомленням,
  // а не двадцятьма таймаутами нижче.
  try {
    const probeKey = `avatars/probe-${crypto.randomUUID()}.txt`;
    await storage.put({
      scope: 'avatars',
      name: `probe-${crypto.randomUUID()}.txt`,
      body: Buffer.from('readiness-check'),
      contentType: 'text/plain',
    });
    await storage.delete(probeKey);
  } catch (err) {
    throw new Error(
      `Сховище недоступне. Підніми його: docker compose up -d minio minio-init. Причина: ${String(err)}`,
    );
  }
});

after(async () => {
  await Promise.all(created.map((key) => storage.delete(key).catch(() => undefined)));
});

describe('S3Storage', () => {
  test('put повертає ключ із префіксом scope, а не URL', async () => {
    const key = await putFixture(Buffer.from('fake-png-bytes'));

    assert.match(key, /^avatars\/[0-9a-f-]{36}\.png$/);
    // У БД має лягати ключ. URL змінюється разом із провайдером і доменом —
    // ключ не змінюється ніколи.
    assert.ok(!key.startsWith('http'), 'ключ не має бути URL');
  });

  test('signedUrl віддає рівно ті байти, які поклали', async () => {
    const payload = crypto.randomBytes(256);
    const key = await putFixture(payload);

    const url = await storage.signedUrl(key, 60);
    const res = await fetch(url);

    assert.equal(res.status, 200);
    const received = Buffer.from(await res.arrayBuffer());
    assert.ok(received.equals(payload), 'завантажені байти мають збігатися з покладеними');
  });

  test('без підпису доступу немає — бакет приватний', async () => {
    const key = await putFixture(Buffer.from('secret'));

    const signed = await storage.signedUrl(key, 60);
    const unsigned = signed.split('?')[0];

    const res = await fetch(unsigned);
    assert.ok(
      res.status === 403 || res.status === 401,
      `очікували відмову без підпису, отримали ${res.status}`,
    );
  });

  test('exists розрізняє наявний і відсутній об\'єкт', async () => {
    const key = await putFixture(Buffer.from('x'));

    assert.equal(await storage.exists(key), true);
    assert.equal(await storage.exists('avatars/00000000-0000-0000-0000-000000000000.png'), false);
  });

  test('delete прибирає об\'єкт', async () => {
    const key = await putFixture(Buffer.from('to-be-deleted'));

    await storage.delete(key);
    assert.equal(await storage.exists(key), false);
  });
});

describe('buildObjectName', () => {
  test('розширення береться з MIME, а не з імені файла', () => {
    assert.match(buildObjectName('image/jpeg'), /\.jpg$/);
    assert.match(buildObjectName('application/pdf'), /\.pdf$/);
  });

  test('невідомий MIME відхиляється', () => {
    assert.throws(() => buildObjectName('application/x-msdownload'), /UNSUPPORTED_FILE_TYPE/);
  });

  test('імена унікальні', () => {
    const names = new Set(Array.from({ length: 100 }, () => buildObjectName('image/png')));
    assert.equal(names.size, 100);
  });
});

describe('isServableKey', () => {
  test('приймає коректні ключі', () => {
    assert.ok(isServableKey('avatars/0707a456-8e7c-401b-a8f2-7cd44cb40fd4.png'));
    assert.ok(isServableKey('company-docs/0707a456-8e7c-401b-a8f2-7cd44cb40fd4.pdf'));
  });

  test('відхиляє обхід шляху й чужі префікси', () => {
    // Ключ приходить із URL, тобто з-під контролю клієнта. Кожен з цих рядків —
    // спроба змусити сервер підписати посилання не на той об'єкт.
    for (const bad of [
      'avatars/../../etc/passwd',
      '../company-docs/x.pdf',
      'backups/dump.pdf',
      'avatars/not-a-uuid.png',
      'avatars/0707a456-8e7c-401b-a8f2-7cd44cb40fd4.exe',
      '',
    ]) {
      assert.equal(isServableKey(bad), false, `мав відхилити: ${bad}`);
    }
  });
});
