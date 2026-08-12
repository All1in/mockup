import { env } from '../config/env';
import { S3Storage } from './s3.storage';
import type { FileStorage, StorageScope } from './storage.types';
import crypto from 'crypto';

export type { FileStorage, StorageScope } from './storage.types';
export { isLegacyDiskPath } from './storage.types';

/**
 * Єдина точка створення сховища.
 *
 * Кидає одразу на старті, якщо ключів немає. Це навмисно: альтернатива —
 * підняти сервер, який приймає реєстрації і падає на першому завантаженні
 * файла. Помилка конфігурації має бути помилкою запуску, а не помилкою
 * користувача через дві години.
 */
export function createStorage(): FileStorage {
  const missing: string[] = [];
  if (!env.STORAGE_BUCKET) missing.push('STORAGE_BUCKET');
  if (!env.STORAGE_ACCESS_KEY_ID) missing.push('STORAGE_ACCESS_KEY_ID');
  if (!env.STORAGE_SECRET_ACCESS_KEY) missing.push('STORAGE_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Сховище не налаштоване: немає ${missing.join(', ')}. ` +
        'Локально підніми MinIO (docker compose up -d minio) і візьми значення з .env.example.',
    );
  }

  return new S3Storage({
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  });
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

/**
 * Ім'я об'єкта будується з uuid, а не з імені, яке надіслав користувач.
 *
 * Причина не в косметиці: оригінальне ім'я — це рядок з-під контролю клієнта,
 * і з нього виходять і path traversal (`../../etc/passwd`), і колізії, і
 * подвійні розширення (`x.pdf.exe`). Розширення беремо з whitelist за MIME,
 * а не з того, що прислали.
 */
export function buildObjectName(mimeType: string): string {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) {
    throw new Error(`UNSUPPORTED_FILE_TYPE: ${mimeType}`);
  }
  return `${crypto.randomUUID()}${ext}`;
}

/** Публічний шлях, за яким застосунок віддає файл (через перевірку прав). */
export function fileRoutePath(key: string): string {
  return `/files/${key}`;
}

/** Ключі, які ми взагалі готові обслуговувати. Захист від довільного шляху в URL. */
const ALLOWED_KEY = /^(avatars|company-docs)\/[0-9a-f-]{36}\.(jpg|png|pdf)$/;

export function isServableKey(key: string): key is `${StorageScope}/${string}` {
  return ALLOWED_KEY.test(key);
}
