/**
 * Стаб бекенда для E2E.
 *
 * НАВІЩО ВІН ІСНУЄ
 *
 * Логін у застосунку йде через Server Action: браузер шле POST на власний URL
 * сторінки, Next.js на сервері робить fetch(BACKEND_URL/auth/login). Через це
 * page.route() з Playwright не працює як точка підміни — мок живе в браузері,
 * а запит виходить з Node-процесу. Мережевий кордон переїхав, і разом з ним
 * переїхала точка підміни: тепер це змінна BACKEND_URL, а не URL-патерн.
 *
 * Цей файл — те, на що BACKEND_URL вказує під час тестів.
 *
 * ЧОМУ СТАБ, А НЕ СПРАВЖНІЙ БЕКЕНД
 *
 * Тести перевіряють реакцію UI на відповідь бекенда: 401, 500, обрив мережі,
 * успіх. Для цього потрібен передбачуваний співрозмовник, а не справжня БД.
 * Від справжнього сервера 500-ку на замовлення не отримаєш взагалі ніяк.
 * Інтеграція зі справжнім бекендом — окреме питання, і йому місце в повільній
 * смузі пайплайну, а не в блокуючій.
 *
 * ЯК КЕРУВАТИ ПОВЕДІНКОЮ
 *
 * Стаб один на весь прогін і спільний для паралельних воркерів, тому керування
 * зроблене без стану: сценарій обирається email-адресою. Так два тести ніколи
 * не переналаштують стаб один одному під ногами.
 *
 *   test@example.com     + Password123!  → 200, ставить cookie
 *   test@example.com     + будь-що інше   → 401 INVALID_CREDENTIALS
 *   slow@example.com                      → те саме 401, але через SLOW_MS
 *   error500@example.com                  → 500
 *   offline@example.com                   → обрив сокета (fetch кине помилку)
 *   будь-хто інший                        → 401
 *
 * Запуск: node tests/support/stub-backend.mjs   (порт зі STUB_PORT, типово 4010)
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT ?? 4010);
const SLOW_MS = Number(process.env.STUB_SLOW_MS ?? 400);

const SEED_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  id: 'stub-user-id',
  name: 'Test User',
};

const ACCESS_TTL = 900;

/**
 * Скільки разів приходив логін з порожнім email.
 *
 * Це не діагностика, а предмет перевірки: тест «сабміт порожньої форми не шле
 * запит» має чимось підтвердити саме відсутність запиту. Лічильник саме для
 * порожнього email, а не загальний, щоб він лишався коректним при паралельних
 * воркерах — жоден інший тест порожній email не сабмітить.
 */
let emptyEmailLoginAttempts = 0;

function json(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function parseCookies(req) {
  const header = req.headers.cookie ?? '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

// Secure свідомо не ставимо — тести ходять по http. Path у refresh_token
// повторює справжній бекенд (cookie віддається тільки на /auth/*).
function sessionCookies() {
  return [
    `access_token=stub-access-token; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ACCESS_TTL}`,
    'refresh_token=stub-refresh-token; Path=/auth; HttpOnly; SameSite=Strict; Max-Age=604800',
  ];
}

function clearedCookies() {
  return [
    'access_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    'refresh_token=; Path=/auth; HttpOnly; SameSite=Strict; Max-Age=0',
  ];
}

function userPayload() {
  return {
    user: {
      id: SEED_USER.id,
      email: SEED_USER.email,
      name: SEED_USER.name,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    accessExpiresIn: ACCESS_TTL,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleLogin(req, res) {
  const body = await readBody(req);
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');

  if (email === '') emptyEmailLoginAttempts += 1;

  // Обрив з'єднання без відповіді — єдиний спосіб змусити fetch() у Server
  // Action піти гілкою catch і повернути NETWORK_ERROR.
  //
  // Саме socket.destroy(), не req.destroy(): останній закриває лише потік
  // читання, з'єднання лишається відкритим, і клієнт замість помилки мережі
  // просто висить до власного таймауту. Різниця між ними — це різниця між
  // NETWORK_ERROR і TIMEOUT на боці Server Action, тобто між двома різними
  // повідомленнями в UI.
  if (email === 'offline@example.com') {
    req.socket.destroy();
    return;
  }

  if (email === 'error500@example.com') {
    json(res, 500, { message: 'Internal server error' });
    return;
  }

  if (email === 'slow@example.com') {
    await sleep(SLOW_MS);
    json(res, 401, { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    return;
  }

  if (email === SEED_USER.email && password === SEED_USER.password) {
    json(res, 200, userPayload(), { 'set-cookie': sessionCookies() });
    return;
  }

  json(res, 401, { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
}

function handleMe(req, res) {
  const cookies = parseCookies(req);
  if (!cookies.access_token) {
    json(res, 401, { message: 'Access token missing', code: 'ACCESS_TOKEN_MISSING' });
    return;
  }
  json(res, 200, userPayload());
}

function handleRefresh(req, res) {
  const cookies = parseCookies(req);
  if (!cookies.refresh_token) {
    json(res, 401, { message: 'Refresh token missing', code: 'REFRESH_TOKEN_MISSING' });
    return;
  }
  json(res, 200, userPayload(), { 'set-cookie': sessionCookies() });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  switch (route) {
    case 'POST /auth/login':
      await handleLogin(req, res);
      return;
    case 'GET /auth/me':
      handleMe(req, res);
      return;
    case 'POST /auth/refresh':
      handleRefresh(req, res);
      return;
    case 'POST /auth/logout':
      json(res, 200, { ok: true }, { 'set-cookie': clearedCookies() });
      return;
    case 'GET /health':
      json(res, 200, { status: 'ok', stub: true });
      return;
    case 'GET /__stub/state':
      json(res, 200, { emptyEmailLoginAttempts });
      return;
    default:
      json(res, 404, { message: `Stub has no handler for ${route}`, code: 'STUB_NOT_IMPLEMENTED' });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`stub-backend listening on http://localhost:${PORT}\n`);
});
