/**
 * Переносить файли з server/uploads/ в об'єктне сховище і переписує посилання
 * в БД з `/uploads/<name>` на ключ `<scope>/<uuid>.<ext>`.
 *
 *   npm run migrate:uploads            -- показати план, нічого не змінювати
 *   npm run migrate:uploads -- --apply -- виконати
 *
 * Три властивості, без яких міграцію не можна запускати проти живої бази:
 *
 * 1. Ідемпотентність. Другий запуск не створює дублікатів: якщо в полі вже
 *    лежить ключ (а не легасі-шлях), запис пропускається.
 * 2. Спершу файл, потім база. Якщо процес обірветься між ними, у сховищі
 *    з'явиться зайвий об'єкт — це сміття, і воно нешкідливе. Зворотний
 *    порядок дав би запис у БД, що вказує в нікуди, — а це вже 404 у
 *    користувача.
 * 3. Dry-run за замовчуванням. Щоб побачити, що саме станеться, не треба
 *    ризикувати нічим.
 *
 * Локальні файли навмисно НЕ видаляються: доки не переконаєшся, що все
 * доїхало, вони — єдина копія.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDb, disconnectDb } from '../db/database';
import { UserModel } from '../db/models/User.model';
import { createStorage, isLegacyDiskPath } from '../storage';
import type { StorageScope } from '../storage';

const APPLY = process.argv.includes('--apply');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

type Field = 'avatarUrl' | 'companyDocumentUrl';

const SCOPE_BY_FIELD: Record<Field, StorageScope> = {
  avatarUrl: 'avatars',
  companyDocumentUrl: 'company-docs',
};

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

interface Plan {
  userId: string;
  field: Field;
  legacyPath: string;
  localFile: string;
  newKey: string;
  fileMissing: boolean;
}

function keyFromLegacyPath(legacyPath: string, field: Field): string {
  // `/uploads/avatar_<uuid>.png` → `avatars/<uuid>.png`.
  // uuid зберігаємо той самий: він уже унікальний, а стабільний ключ дає
  // можливість перезапустити міграцію без створення другої копії.
  const base = path.basename(legacyPath);
  const ext = path.extname(base).toLowerCase();
  const withoutExt = base.slice(0, -ext.length);
  const uuid = withoutExt.replace(/^(avatar|company_doc)_/, '');
  return `${SCOPE_BY_FIELD[field]}/${uuid}${ext === '.jpeg' ? '.jpg' : ext}`;
}

async function buildPlan(): Promise<Plan[]> {
  const users = await UserModel.find({
    $or: [
      { avatarUrl: { $regex: '^/uploads/' } },
      { companyDocumentUrl: { $regex: '^/uploads/' } },
    ],
  }).lean();

  const plans: Plan[] = [];

  for (const user of users) {
    for (const field of ['avatarUrl', 'companyDocumentUrl'] as Field[]) {
      const value = user[field];
      if (typeof value !== 'string' || !isLegacyDiskPath(value)) continue;

      const localFile = path.join(UPLOADS_DIR, path.basename(value));
      let fileMissing = false;
      try {
        await fs.access(localFile);
      } catch {
        fileMissing = true;
      }

      plans.push({
        userId: String(user._id),
        field,
        legacyPath: value,
        localFile,
        newKey: keyFromLegacyPath(value, field),
        fileMissing,
      });
    }
  }

  return plans;
}

async function main(): Promise<void> {
  await connectDb();
  const storage = createStorage();

  const plans = await buildPlan();

  if (plans.length === 0) {
    console.log('Нема чого мігрувати: легасі-посилань у БД не знайдено.');
    await disconnectDb();
    return;
  }

  console.log(`Знайдено ${plans.length} посилань на локальні файли:\n`);
  for (const p of plans) {
    const mark = p.fileMissing ? '  ФАЙЛ ВІДСУТНІЙ' : '';
    console.log(`  ${p.userId}  ${p.field}`);
    console.log(`    ${p.legacyPath}  →  ${p.newKey}${mark}`);
  }

  const missing = plans.filter((p) => p.fileMissing);
  if (missing.length > 0) {
    console.log(
      `\n${missing.length} записів указують на файли, яких на диску вже немає.\n` +
        'Це і є та сама тиха втрата даних, заради якої робиться переїзд: база\n' +
        'виглядає здоровою, а файлів немає. Такі записи будуть очищені (поле\n' +
        'стане порожнім) — це чесніше, ніж лишати посилання в нікуди.',
    );
  }

  if (!APPLY) {
    console.log('\nЦе dry-run. Щоб виконати: npm run migrate:uploads -- --apply');
    await disconnectDb();
    return;
  }

  console.log('\nВиконую...\n');
  let uploaded = 0;
  let cleared = 0;

  for (const p of plans) {
    if (p.fileMissing) {
      await UserModel.updateOne({ _id: p.userId }, { $unset: { [p.field]: '' } });
      cleared += 1;
      console.log(`  очищено ${p.field} у ${p.userId} (файла не було)`);
      continue;
    }

    // Спершу сховище, потім база — див. пункт 2 у шапці файла.
    if (await storage.exists(p.newKey)) {
      console.log(`  ${p.newKey} вже у сховищі, пропускаю завантаження`);
    } else {
      const body = await fs.readFile(p.localFile);
      const ext = path.extname(p.localFile).toLowerCase();
      const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
      await storage.put({
        scope: SCOPE_BY_FIELD[p.field],
        name: path.basename(p.newKey),
        body,
        contentType,
      });
      uploaded += 1;
      console.log(`  завантажено ${p.newKey}`);
    }

    await UserModel.updateOne({ _id: p.userId }, { $set: { [p.field]: p.newKey } });
  }

  console.log(
    `\nГотово. Завантажено: ${uploaded}, очищено битих посилань: ${cleared}.\n` +
      'Локальні файли не видалені — прибери server/uploads/ вручну, коли\n' +
      'переконаєшся, що все на місці.',
  );

  await disconnectDb();
}

main().catch(async (err) => {
  console.error('Міграція впала:', err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
