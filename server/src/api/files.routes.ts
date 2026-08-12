import { Router } from 'express';
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import type { FileStorage } from '../storage';
import { isServableKey } from '../storage';

/**
 * Видача файлів із сховища.
 *
 * Замінює `app.use('/uploads', express.static(...))`, який роздавав усю
 * директорію будь-кому без автентифікації. Аватар — ще пів біди; там же
 * лежали `company_doc_*.pdf`, тобто документи компаній, доступні кожному, хто
 * вгадає або підгледить URL. Ім'я з uuid ускладнює вгадування, але це
 * secrecy by obscurity: посилання витікає в реферери, в історію, в бекапи.
 *
 * Тепер кожен запит проходить три перевірки — автентифікація, форма ключа,
 * право саме цього користувача саме на цей файл — і лише потім отримує
 * короткоживуче підписане посилання.
 */
export function createFileRoutes(storage: FileStorage, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/*key', requireAuth, async (req, res) => {
    const key = String((req.params as Record<string, unknown>).key ?? '');

    // Форма ключа перевіряється до будь-якого звернення в сховище. Ключ
    // приходить із URL, тобто з-під контролю клієнта: без цієї перевірки
    // сюди можна підставити довільний шлях і змусити сервер підписати
    // посилання на чужий об'єкт у тому ж бакеті.
    if (!isServableKey(key)) {
      res.status(400).json({ error: 'Bad Request', message: 'Некоректний ключ файла' });
      return;
    }

    // requireAuth уже поклав сюди повного користувача — другий похід у БД був
    // би зайвим запитом на кожну картинку.
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', code: 'ACCESS_TOKEN_MISSING' });
      return;
    }

    // Авторизація: користувач має доступ рівно до тих ключів, які записані в
    // його власному документі. Жодних «якщо це аватар, то можна» — аватар
    // чужого користувача теж не наша справа.
    const ownsKey = user.avatarUrl === key || user.companyDocumentUrl === key;
    if (!ownsKey) {
      // 404, а не 403: 403 підтверджує, що об'єкт існує, і перетворює
      // ендпоінт на оракул для перебору чужих ключів.
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    const url = await storage.signedUrl(key, env.STORAGE_SIGNED_URL_TTL);

    // Редірект, а не проксіювання байтів: файл їде від сховища до клієнта
    // напряму, повз наш процес. Проксіювання зробило б кожен аватар витратою
    // пам'яті й трафіку бекенда.
    //
    // no-store обов'язковий: інакше проміжні кеші збережуть 302 із підписаним
    // посиланням і віддаватимуть його після того, як права зміняться.
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  });

  return router;
}
