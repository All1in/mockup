/**
 * Драйвер для будь-якого S3-сумісного сховища.
 *
 * Один і той самий код обслуговує Cloudflare R2, AWS S3, Backblaze B2 і MinIO —
 * відрізняються вони тільки endpoint'ом і стилем адресації. Саме тому локальна
 * розробка й CI ходять у MinIO в контейнері, а прод — у справжній бакет: шлях
 * коду однаковий, отже тестуємо те, що поїде.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FileStorage, PutObjectInput } from './storage.types';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  /** Порожній для AWS S3; обов'язковий для R2 та MinIO. */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * MinIO і більшість self-hosted сумісних сховищ адресують бакет шляхом
   * (host/bucket/key), а не піддоменом (bucket.host/key).
   */
  forcePathStyle: boolean;
}

export class S3Storage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(input: PutObjectInput): Promise<string> {
    const key = `${input.scope}/${input.name}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        // Клієнт ніколи не звертається до об'єкта напряму — тільки через
        // підписане посилання, яке видає наш ендпоінт після перевірки прав.
        // Тому ACL не виставляємо: бакет має лишатись повністю приватним.
        // Публічний бакет робить перевірку прав декоративною.
      }),
    );

    return key;
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      // 404/NotFound — це відповідь, а не збій. Решту помилок (немає прав,
      // немає мережі, немає бакета) ковтати не можна: інакше міграція вирішить,
      // що об'єкта немає, і мовчки перезапише його або створить дублікат.
      const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      const name = (err as { name?: string })?.name;
      if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') {
        return false;
      }
      throw err;
    }
  }
}
