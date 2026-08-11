# Backend Communication Strategy Audit

> Аудит провів старший фронтенд-інженер (10+ років, продакшн React / Next.js).
> Стиль — як інтерв'юер + ментор. Пояснення — простою мовою, як для джуна.
> Усі факти — з реальних файлів проєкту. Нічого не вигадано.

---

## 0. TL;DR (читай це перед усім)

- Стек комунікації: **REST + Axios + TanStack Query v5 + Zod (схеми є, але не використовуються для рантайм-валідації відповідей)** + Next.js Server Actions для логіну.
- Архітектура **робоча, локально продакшн-готова, але з кількома помітними проблемами**: дві Axios-інстанції, обхід Zod, не уніфіковані ключі кешу, частина auth-логіки сидить у глобальних модульних змінних.
- Вибір REST + TanStack Query **виправданий**: бекенд у тебе вже REST (`server/src/`), один клієнт (web), не потрібні підписки/нормалізований кеш. Переходити на GraphQL **не треба**.
- Для Strong Middle інтерв'ю — підхід **захищається сильно**, але є 4-5 конкретних слабких місць, які треба заздалегідь пояснити і знати, як виправити.

Фінальні бали (детально нижче):
- Архітектура комунікації: **62/100**
- Type safety (рантайм + компайл-тайм разом): **55/100**
- Production readiness: **60/100**
- Сила на інтерв'ю: **70/100**

---

## 1. Який підхід зараз використовується

### 1.1 Бібліотеки і де вони підключені

З `client/package.json`:

```json
"@tanstack/react-query": "^5.90.21",
"@tanstack/react-query-devtools": "^5.91.3",
"axios": "^1.13.5",
"zod": "^4.3.6",
"react-hook-form": "^7.71.2",
"@hookform/resolvers": "^5.2.2"
```

Тобто стек — класичний REST + TanStack Query + Axios. **GraphQL / Apollo / urql / SWR не використовуються взагалі.**

### 1.2 Де живе клієнт

Є **дві окремі Axios-інстанції** — це вже перший важливий нюанс.

**Глобальний клієнт** — `client/src/lib/api/api.ts`:

```ts
const apiBaseEnv = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
export const API_BASE = apiBaseEnv ? apiBaseEnv : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
```

Він обслуговує: `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/refresh`, `/dashboard/*`, `/api/check-email`, `/api/check-inn`, `/api/register`.

**Окремий клієнт для блогу** — `client/src/features/blog/api/blog.api.ts`:

```ts
const internalApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  paramsSerializer: (params) => { ... },
});
```

Цей клієнт ходить **на Next.js Route Handler** (`client/src/app/api/blog/posts/route.ts`), а не на Express бекенд. Зроблено через rewrites у `client/next.config.ts`:

```ts
// NOTE: intentionally no rewrite for /api/blog/:path*
// so Next.js Route Handlers under app/api/blog handle it.
```

### 1.3 Як підключений TanStack Query

`client/src/app/providers.tsx`:

```ts
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}
```

DevTools завантажуються **динамічно лише в dev** — це гарно.

### 1.4 Потік даних backend → UI (приклад: блог)

```
Backend (Next.js Route Handler /api/blog/posts)
        ↓ HTTP GET
internalApi.get<unknown>('/blog/posts', { params })       ← blog.api.ts
        ↓ axios → JSON → cast `as BlogPostsListResponse`
useInfiniteBlogPosts(limit, filters)                      ← hooks/useInfiniteBlogPosts.ts
        ↓ useInfiniteQuery + queryKey: blogKeys.infinitePosts(...)
BlogPageView                                              ← ui/BlogPageView.tsx
        ↓ posts.flatMap(p => p.posts)
VirtualBlogPostList → BlogPostCard
```

Для дашборду коротше: `getDashboardActivity()` → `useDashboardActivity()` → таблиця.

### 1.5 Auth — окрема історія

Логін **не йде через Axios**, він йде через Next.js Server Action:

`client/src/app/actions/auth.actions.ts`:

```ts
'use server';
res = await fetch(`${BACKEND_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(parsed.data),
  signal: controller.signal,
  cache: 'no-store',
});
// ... потім вручну парсиш Set-Cookie і ставиш cookies()
```

А ось **refresh / 401-retry / cross-tab sync** — це axios інтерсептор у `client/src/lib/auth/auth.ts`. Тобто комунікація з auth-бекендом розділена на два шляхи: Server Action для `login`, Axios для всього іншого. Це усвідомлений вибір (server action ставить httpOnly-cookie на сервері), але вартує знати про цю асиметрію.

---

## 2. Production Readiness Audit

Оцінюю строго. Бали 1–10 (10 — еталон, 7 — норм, 5 — є проблеми, нижче — критично).

| Area | Score /10 | Comment |
|------|-----------|---------|
| API abstraction | **6** | Є два axios-інстанси (`api.ts` + `blog.api.ts`), один з них обходить refresh-інтерсептор. Endpoints — рядки в коді, не з контракту. |
| Type safety | **5** | TypeScript є, Zod-схеми описані (`blog.schemas.ts`), але **на клієнті схеми не парсять відповідь** — лише `data as BlogPostsListResponse`. Це cast, а не валідація. |
| Caching | **7** | Чесно налаштовані `staleTime` (15s/30s/60s/5min залежно від даних), `keepPreviousData` для пагінованої таблиці. Але **немає інвалідації після мутацій** (бо мутацій майже нема, окрім logout). |
| Error handling | **6** | `toApiError` уніфікує помилки в `ApiError`, `BlogError` має retry. Але код помилок на рівні бекенду (`code`) використовується мало (тільки `INVALID_CREDENTIALS`, `REFRESH_CONCURRENT`). |
| Auth handling | **8** | Найсильніша частина. Mutex на refresh, failed-queue, BroadcastChannel між табами, `visibilitychange`-перевірка, localStorage TTL, обробка 409 `REFRESH_CONCURRENT`. Це доросла реалізація. |
| Scalability | **6** | Поки 2 фічі (auth, blog) + dashboard — все в одному стилі, але стиль не однаковий: blog має `blog.keys.ts`, dashboard — інлайн ключі. Як буде 10 фіч — буде хаос. |
| Maintainability | **6** | Дублікати: `useEmailAvailability.ts` і `useInnAvailability.ts` майже ідентичні. Два axios-клієнти. Endpoint-рядки розкидані. |
| DX | **7** | TanStack DevTools підключені, типи є, але повна відсутність кодогенерації з API — кожен ендпойнт пишеш руками + типи руками. |

**Загалом: 51/80 ≈ 6.4/10.** Це міцний middle-рівень. Для Strong Middle треба підтягнути type safety і уніфікувати abstraction.

---

## 3. Що зараз сильне (реальні плюси з твого коду)

### 3.1 Auth — без перебільшення, дорослий рівень

Подивись на `client/src/lib/auth/auth.ts:231-265`. Тут **mutex + failed queue**:

```ts
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then(() => api(originalRequest));
}
isRefreshing = true;
```

Це класичний production-патерн. Якщо одночасно 5 запитів отримали 401 — рефреш виконається **один раз**, решта дочекаються і повторяться. На інтерв'ю це сильний приклад.

Плюс там же:
- Обробка 409 `REFRESH_CONCURRENT` із `Retry-After` header (`getRetryAfterMs`)
- BroadcastChannel('auth') — синхронізація логіну/логауту між табами
- `visibilitychange` — превентивний refresh, коли таба знов стає активною
- Проактивний таймер за 60 секунд до експірейшену (`scheduleRefreshTimer`)
- Відновлення сесії з `localStorage` після релоаду (`AUTH_EXP_KEY`)

Більшість проєктів цього не мають взагалі.

### 3.2 HttpOnly cookies + Server Action для логіну

`client/src/app/actions/auth.actions.ts` — логін виконується на сервері Next.js, він читає `Set-Cookie` від Express і прокидує його через `cookies()` API. **Токен ніколи не торкається JS на клієнті.** Це правильно з точки зору безпеки (XSS не може вкрасти).

### 3.3 Infinite scroll зроблений нормально

`client/src/features/blog/hooks/useInfiniteBlogPosts.ts`:

```ts
return useInfiniteQuery({
  queryKey: blogKeys.infinitePosts(limit, filters),
  queryFn: ({ pageParam }) => getBlogPostsPage({ limit, offset: pageParam ?? 0, ... }),
  getNextPageParam: lastPage =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
  initialPageParam: 0,
  staleTime: 60_000,
  gcTime: 5 * 60_000,
});
```

Є `hasMore`, є `offset`, є коректний `getNextPageParam`. У `BlogPageView.tsx:38-43` ще й дедуплікація через `Map<id, post>` — це захищає від дубльованих постів якщо бекенд поверне зміщений pageframe.

### 3.4 Query key factory (хоча б для блогу)

`client/src/features/blog/hooks/blog.keys.ts`:

```ts
export const blogKeys = {
  all: ['blog'] as const,
  posts: () => [...blogKeys.all, 'posts'] as const,
  infinitePosts: (limit, filters) => [...blogKeys.all, 'posts', 'infinite', limit, filters ?? {}] as const,
  post: (slug) => [...blogKeys.all, 'post', slug] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
};
```

Це дозволяє інвалідувати `['blog']` і скинути все блогове разом. На інтерв'ю згадай цей патерн словами **"hierarchical query key factory"**.

### 3.5 SSR + клієнтська гідрація для першого екрана

`client/src/app/blog/page.tsx` рендерить `BlogHeroServer` (Featured post) на сервері — це для LCP. А `BlogPageView` — клієнт, бо там фільтри, virtual scroll, infinite query. Розділення логічне.

### 3.6 `keepPreviousData` для пагінованої таблиці

`client/src/hooks/useDashboardActivity.ts`:

```ts
return useQuery({
  queryKey: ['dashboard-activity', page, rowsPerPage, normalizedQ],
  queryFn: () => getDashboardActivity(rowsPerPage, offset, normalizedQ || undefined),
  placeholderData: keepPreviousData,
  retry: false,
  staleTime: 30_000,
});
```

`keepPreviousData` — це невеличка, але важлива деталь UX: при перемиканні сторінок таблиця не миготить лоадером.

### 3.7 Зрозумілий потік даних

REST дає одну важливу річ: **відкрив DevTools → Network → бачиш HTTP запит → бачиш body → бачиш статус**. На GraphQL це не так очевидно (всі запити летять POST на `/graphql`). Для команди це **easier debugging** на дистанції.

---

## 4. Що зараз слабке (з конкретними прикладами)

### 4.1 Дві axios-інстанції — і одна з них **обходить** твій refresh

`client/src/features/blog/api/blog.api.ts`:

```ts
const internalApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  paramsSerializer: ...,
});
```

Цей `internalApi` — **окремий від `api`**, тому інтерсептор з `client/src/lib/auth/auth.ts:180-266` на нього не діє. Якщо ендпойнт блогу колись стане захищеним — refresh-flow ти втратиш мовчки.

Те, що зараз блог йде на Next.js Route Handler і там auth не потрібен — ок. Але це невидима асиметрія, яка ламається мовчки.

### 4.2 Zod-схеми описані, але на клієнті не парсять

`client/src/features/blog/lib/blog.schemas.ts` має `BlogPostsListResponseSchema`, `BlogPostSchema`, тощо.

Але `client/src/features/blog/api/blog.api.ts:23`:

```ts
const { data } = await internalApi.get<unknown>('/blog/posts');
return data as BlogPostsListResponse;
```

`as` — це **компайл-тайм cast**, він **нічого не валідує в рантаймі**. Якщо бекенд віддасть `{ posts: null }` — TypeScript не зловить, ти впадеш десь у `posts.flatMap(...)` всередині `BlogPageView`.

Сервер парсить (`route.ts:34` — `BlogPostsListResponseSchema.parse(payload)`), але на клієнтському боці ти довіряєш типам сліпо. Це **головна слабкість type safety** у проєкті.

### 4.3 Можливий баг з префіксом `/api/api/...`

`api.ts:13`:
```ts
export const API_BASE = apiBaseEnv ? apiBaseEnv : '/api';
```

`api.ts:48`:
```ts
const { data } = await api.get<{ available: boolean }>(`/api/check-email?email=...`)
```

Якщо `NEXT_PUBLIC_API_URL` порожній → `API_BASE = '/api'` → фактичний URL стає **`/api/api/check-email`**. А rewrite в `next.config.ts:25` чекає `/api/check-email`. Тобто або в тебе `NEXT_PUBLIC_API_URL` = `''` (`baseURL` стає пустим), або реально в дев-середовищі цей запит зараз 404. Перевір в DevTools → Network. Це не "неправильний підхід", це конкретний баг від плутанини префіксів.

### 4.4 Query keys — два різні стилі

- Блог: `blogKeys.infinitePosts(limit, filters)` — типобезпечно, рефакторити легко.
- Dashboard: `['dashboard-activity', page, rowsPerPage, normalizedQ]`, `['dashboard-overview']`, `['btc-usdt-candles', interval, limit]`, `['me']`, `['logout']` — інлайн рядки, розкидані по 5 файлах.

Це небезпечно: щоб зробити `queryClient.invalidateQueries(['dashboard-activity'])` після мутації, ти маєш **пам'ятати точне написання**. Зміниш у одному місці — інше місце мовчки відключиться від інвалідації.

### 4.5 Дублікат хука: email vs inn

`client/src/hooks/useEmailAvailability.ts` і `client/src/hooks/useInnAvailability.ts` — це **той самий код** з мінімальними правками (нормалізація, мін. довжина):

```ts
// useEmailAvailability.ts
const available = await qc.fetchQuery({
  queryKey: ['checkEmail', email],
  queryFn: () => getEmail(email),
  staleTime: 5 * 60 * 1000,
});

// useInnAvailability.ts
const valid = await qc.fetchQuery({
  queryKey: ['checkInn', inn],
  queryFn: () => getInn(inn),
  staleTime: 5 * 60 * 1000,
});
```

Це screaming `useAvailabilityCheck<T>(...)` дженерик. Зараз — копіпаста, яку доведеться синхронно фіксити в обох місцях.

### 4.6 Endpoint URL-и — рядки в коді

`api.post('/auth/login', ...)`, `api.get('/dashboard/overview')`, `internalApi.get('/blog/posts')`. Якщо бекенд переіменує endpoint, IDE не знайде використання. Немає **єдиного джерела правди** про API — ні OpenAPI спеки, ні згенерованих типів.

### 4.7 `RegisterMultipartResponse` — небезпечний union успіх/помилка

`client/src/types/apiTypes.ts:34`:

```ts
export type RegisterMultipartResponse =
  | { userId: string }
  | { error: string; field: string };
```

І в `api.ts:138-141` помилку **повертають як success-result**, а не кидають:

```ts
if (typeof err === 'string' && typeof field === 'string') {
  return { error: err, field } satisfies RegisterMultipartResponse;
}
```

Це змішує два рівні: TanStack Query не знає, що це помилка → не виставить `isError`, не зробить `retry`, не покаже `BlogError`. Кожен caller буде вручну дивитись `if ('error' in result)`. Це антипатерн.

### 4.8 Глобальний модульний state у auth

`client/src/lib/auth/auth.ts:16-18`:

```ts
let tokenExpiresAt: number | null = null;
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
```

І далі `let isRefreshing = false; let refreshPromise: Promise<void> | null = null; let failedQueue = [...]`.

Це **module-level mutable state**. Один QueryClient на додаток — ок, але цей стейт не testable: щоб написати unit-тест на refresh flow, тобі треба перезавантажувати модуль.

### 4.9 `useAuth` повертає тип, який не відповідає реальності

`client/src/hooks/useAuth.ts:5-8`:

```ts
export function useAuth() {
  return useQuery({ queryKey: ["me"], queryFn: authMe, retry: false })
}
```

`authMe` повертає `Promise<AuthUser>` (`api.ts:34`), але ти не передаєш дженерик у `useQuery<AuthUser>(...)`. TS це виведе, але контракт неявний. Дрібниця, але якщо `authMe` поверне `void` — TS на стороні `PrivateRoute` нічого не помітить.

### 4.10 Немає request cancellation і AbortController на рівні шарів

TanStack Query сам передає `signal` у `queryFn` через `({ signal }) => ...`, але **жоден з твоїх API-методів його не використовує**. Тобто перехід між сторінками не скасує летючий запит.

### 4.11 Немає optimistic updates

У проєкті є `useMutation` тільки для `logout` (`WelcomeClientContent.tsx:55`). Жодного оптимістичного апдейту, жодних `onMutate`/`onSettled`/`invalidateQueries` колбеків. Як тільки з'являться CRUD-фічі — це доведеться будувати з нуля.

---

## 5. Порівняння з GraphQL + Apollo Client

| Criteria | Current (REST + TanStack Query) | GraphQL + Apollo | Winner | Чому |
|---|---|---|---|---|
| **Type safety (compile-time)** | TS типи руками | `graphql-codegen` → авто-типи з SDL | **Apollo** | Codegen виключає клас "забув оновити тип" |
| **Type safety (runtime)** | Zod є, але не парсить відповідь (`data as ...`) | Apollo не парсить, але типи генеруються з контракту | **Tie** (обидва не валідують) | Будь-який потребує zod/io-ts на додачу |
| **Caching** | TanStack Query (key-based, per-query) | Apollo InMemoryCache (нормалізований по `id`) | **Apollo** для зв'язаних даних, **TanStack** для простих | Нормалізація = 1 запис змінив юзера → всі його екземпляри оновилися |
| **Request deduplication** | З коробки в TanStack | З коробки в Apollo | **Tie** | |
| **Overfetching / underfetching** | Є завжди — REST віддає весь DTO | Клієнт сам каже які поля треба | **Apollo** | Особливо помітно в мобілці |
| **DX** | Просто, передбачувано | SDL + codegen + резолвери — більше кроків | **REST** для маленьких команд | |
| **Debugging** | DevTools → Network → бачиш URL і body | Усе POST `/graphql` → треба читати body запиту | **REST** | TanStack Query DevTools у тебе вже є |
| **Backend complexity** | Ендпойнт = маршрут | Schema + resolvers + DataLoader проти N+1 | **REST** | У тебе Express з простими роутами — GraphQL = +тиждень роботи |
| **Frontend complexity** | Hook + axios call | Hook + GraphQL document + cache policy | **REST** | |
| **Performance** | Багато round-trips для зв'язаних ресурсів | 1 запит — багато ресурсів | **Apollo** для нестед-даних | У тебе блог — flat, тут не потрібно |
| **Scalability (team)** | Conventions ростуть органічно | Schema-first дисциплінує велику команду | **Apollo** для 10+ розробників | У тебе явно не той кейс |
| **Code generation** | Треба налаштовувати окремо (Orval/openapi-typescript) | Native (`graphql-codegen`) | **Apollo** | |
| **Real-time subscriptions** | WebSocket руками (`useResilientWebSocket.ts`) | Subscriptions з коробки + cache update | **Apollo** | У тебе вже є WS — для одного фічі це ок |
| **Pagination** | `useInfiniteQuery` з `getNextPageParam` | Relay-style cursors + `fetchMore` | **Tie** | Обидва нормально вирішують |
| **Error handling** | HTTP статус-коди (звичні) | `errors[]` поле в JSON, `200 OK` навіть на помилку | **REST** | HTTP-семантика простіша |
| **Learning curve** | TanStack за 1 день | Apollo + GraphQL + codegen + cache policies — тиждень | **REST** | |

**Висновок:** для **твого** проєкту GraphQL — overkill. У тебе один клієнт (web), бекенд REST, дані пласкі, реал-тайм один (Binance) — він не GraphQL-ський.

---

## 6. Коли GraphQL + Apollo дійсно кращий вибір (production-приклади)

1. **Багато клієнтів на одному API** — web + iOS + Android + smart TV. Кожен бере тільки свої поля.
2. **Складні nested-дані** — фід соцмережі: `post → author → posts[] → comments[] → user`. На REST це 4-5 запитів або жирний `?include=`.
3. **Часті продуктові експерименти** — бекенд міняє схему, фронт швидко бере нові поля без релізу бекенда.
4. **Schema-first команда** — продакт-менеджери, дизайнери, бекенд-, фронтенд-інженери всі говорять однією мовою (SDL).
5. **Subscriptions як перший клас** — Slack-подібний месенджер, real-time editing (Figma), live dashboards.
6. **Client-driven data selection** — мобільний app зі слабким нет: бере `title + thumbnail`, web бере все.
7. **Великий бекенд із багатьма мікросервісами** — GraphQL Federation / Stitching агрегує їх в одну схему.

Реальний кейс: **Facebook** (там GraphQL і народився), **GitHub API v4**, **Shopify Admin API**, **Twitch**.

---

## 7. Коли REST + TanStack Query кращий (твій кейс)

1. **Бекенд уже REST** — `server/src/auth/auth.routes.ts`, `server/src/db/...`. Переписувати під SDL = тижні роботи без бізнес-цінності.
2. **Прості ресурси** — у тебе пост, юзер, dashboard activity. Це CRUD без глибоких графів.
3. **Один клієнт** — лише `client/`. GraphQL виправдано, коли клієнтів багато.
4. **Чітка власність ендпойнтів** — `/auth/login` робить login, не треба думати "а що ця query запитає".
5. **HTTP cache compatibility** — у тебе в `app/api/blog/posts/route.ts` вже стоїть:
   ```ts
   'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
   ```
   GraphQL це викидає (POST не кешується HTTP-стеком).
6. **Менша команда** — codegen + schema reviews + Apollo cache policies — це окрема людина-тиждень. У тебе явно не той розмір.
7. **Швидке доставлення** — додати endpoint = додати маршрут + хук. Без SDL міграцій.

---

## 8. Що б Senior покращив (без переходу на GraphQL)

Сортовано за "віддачею за день роботи".

### 8.1 Уніфікувати клієнт — один `apiClient`, не два (1 година)

**Чому:** зараз `internalApi` (blog) обходить твій refresh-flow і використовує власний `paramsSerializer`. Це невидима асиметрія.

**Де:** `client/src/lib/api/api.ts` зробити єдиний `apiClient` з `paramsSerializer`, видалити `internalApi` з `blog.api.ts`, переписати на спільний.

```ts
// client/src/lib/api/client.ts
export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  paramsSerializer: (params) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach(x => sp.append(k, String(x)));
      else if (v != null) sp.set(k, String(v));
    }
    return sp.toString();
  },
});
```

### 8.2 Включити Zod-валідацію на boundary (2 години)

**Чому:** Це твій єдиний реальний рантайм-захист від змін на бекенді. Зараз ти описав схеми, але викидаєш їх.

**Де:** `client/src/features/blog/api/blog.api.ts:23,37,53,62`. Замість `as` — `.parse()`.

```ts
import { BlogPostsListResponseSchema, BlogPostResponseSchema, BlogCategoriesResponseSchema } from '../lib/blog.schemas';

export async function getBlogPostsPage(params): Promise<BlogPostsListResponse> {
  try {
    const { data } = await apiClient.get('/blog/posts', { params });
    return BlogPostsListResponseSchema.parse(data);   // ← ось так
  } catch (error) {
    throw toApiError(error);
  }
}
```

Якщо бекенд віддасть зламану відповідь — Zod кине, ти впіймаєш в `BlogError` і покажеш юзеру retry, а не 500-та в консолі.

### 8.3 Згенерувати типи з API-контракту (півдня — день)

**Чому:** Ти зараз руками тримаєш `dashboardTypes.ts`, `apiTypes.ts`. Бекенд переіменує поле — ти про це дізнаєшся в проді.

**Як:**
- Якщо бекенд видає OpenAPI/Swagger — використай `openapi-typescript` (генерує `.d.ts`) або `Orval` (генерує типи + готові React Query хуки).
- Якщо OpenAPI нема — додай йому Swagger в Express (zod-to-openapi, бо у тебе Zod на бекенді).

Це **єдина зміна, яка реально вирішує "type safety для всього"**, а не латає по одному ендпойнту.

### 8.4 Уніфікувати query keys (1 година)

**Чому:** дивись 4.4. Зробить інвалідацію передбачуваною.

**Де:** Перевести `useDashboardActivity`, `useDashboardOverview`, `useDashboardUsersByCountry`, `useBtcUsdtCandles`, `useAuth` на key factory.

```ts
// client/src/hooks/dashboard.keys.ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  activity: (page: number, perPage: number, q?: string) =>
    [...dashboardKeys.all, 'activity', { page, perPage, q: q ?? '' }] as const,
  usersByCountry: () => [...dashboardKeys.all, 'usersByCountry'] as const,
  btcCandles: (interval: BtcCandleInterval, limit: number) =>
    [...dashboardKeys.all, 'btcCandles', interval, limit] as const,
};

// client/src/hooks/auth.keys.ts
export const authKeys = { me: () => ['auth', 'me'] as const };
```

### 8.5 Винести `useAvailabilityCheck` як generic (30 хвилин)

**Чому:** дублікат коду, дивись 4.5.

```ts
// client/src/hooks/useAvailabilityCheck.ts
type Args<T> = {
  fetcher: (value: string) => Promise<T>;
  keyPrefix: string;
  normalize?: (raw: string) => string;
  isAcceptableInput?: (normalized: string) => boolean;
  debounceMs?: number;
};

export function useAvailabilityCheck<T>({ fetcher, keyPrefix, normalize = v => v.trim().toLowerCase(), isAcceptableInput = Boolean, debounceMs = 500 }: Args<T>) {
  // ... логіка з useEmailAvailability, але універсальна
}
```

### 8.6 Передавати `signal` у axios для cancellation (30 хв)

**Чому:** TanStack Query вже передає `signal` через `queryFn({ signal })`. Зараз ти його ігноруєш.

```ts
queryFn: ({ signal }) => getBlogPostsPage({ ... }, { signal }),
// і в API:
export async function getBlogPostsPage(params, opts?: { signal?: AbortSignal }) {
  const { data } = await apiClient.get('/blog/posts', { params, signal: opts?.signal });
}
```

### 8.7 Додати retry policy за класами помилок (30 хв)

Зараз: `retry: false` для одних, `retry: 2` для інших, default для третіх. Це не політика — це випадковість.

```ts
// QueryClient defaults
queries: {
  staleTime: 60_000,
  retry: (failureCount, error) => {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403 || error.status === 404) return false;
      if (failureCount >= 2) return false;
      return true;
    }
    return failureCount < 2;
  },
},
```

### 8.8 Виправити `RegisterMultipartResponse` — кидати, не повертати (15 хв)

```ts
if (axios.isAxiosError(error)) {
  const { error: err, field } = error.response?.data ?? {};
  if (typeof err === 'string' && typeof field === 'string') {
    throw new ApiError(err, { code: 'VALIDATION_ERROR', rawError: field });
  }
}
throw toApiError(error);
```

### 8.9 Cache invalidation на logout (5 хв)

`WelcomeClientContent.tsx:60` робить `queryClient.removeQueries({ queryKey: ['me'] })`. Цього мало — після logout треба **скинути весь кеш**, бо в ньому можуть бути приватні дані іншого юзера, які не мають "me" в ключі.

```ts
onSuccess: () => {
  queryClient.clear();
  window.location.replace('/sign-in');
},
```

### 8.10 ViewModel mapping для DTO (на майбутнє)

Як тільки появиться 3+ компоненти, які крутять дату через `new Date(post.publishedAt).toLocaleDateString()` — винось це у `mapPostDtoToVM(dto)`. Зараз `getPostMetaLine` в `blog.utils.ts` вже робить щось подібне — це гарний початок, продовжуй так.

---

## 9. Що казати на інтерв'ю (Strong Middle level answers)

### Q1. Чому ви обрали REST + TanStack Query, а не GraphQL?

**A:** Бекенд проєкту вже REST на Express, і немає сценаріїв, які б GraphQL вирішував краще: один клієнт (web), пласкі дані (auth, dashboard, blog), реал-тайм один — Binance WebSocket. Перехід на GraphQL — це SDL, codegen, нормалізований кеш, переписаний бекенд із резолверами і DataLoader проти N+1. Без бізнес-обґрунтування це "технологія заради технології". TanStack Query закриває кешування, дедуплікацію, infinite scroll, retry, optimistic updates — те, чого не вистачає голому fetch.

### Q2. Які тут tradeoff-и?

**A:** Головні три:
1. Overfetching: REST віддає весь DTO, навіть якщо UI використовує 30% полів.
2. Type safety тільки compile-time — рантайм валідації немає, якщо не додати Zod.
3. Інвалідація кешу — ручна, через query keys; в Apollo це робиться автоматично через нормалізований кеш по `id`.

Я живу з ними, бо вони дешевші, ніж операційна вартість GraphQL для маленької команди.

### Q3. Коли б я обрав GraphQL?

**A:** Багато клієнтів на одному API (web + native), глибоко nested продукт-домен (соцмережа, e-commerce каталог), schema-first команда з продактами і бекендерами разом, або коли підписки — first-class фіча (live editing, чати).

### Q4. Як ви ведете кешування і інвалідацію?

**A:** TanStack Query Provider має `staleTime: 60_000` дефолтом. Per-query — більше для довговічних даних (categories — 5 хв, dashboard — 30-60 с, активні графіки — 15 с). Ключі — через query key factory (`blogKeys.posts()`, `blogKeys.post(slug)`), що дає ієрархічну інвалідацію через `invalidateQueries({ queryKey: blogKeys.all })`. На logout — `queryClient.clear()`, бо приватні дані більше не валідні. `keepPreviousData` для пагінованої таблиці, щоб не миготіло.

### Q5. Як ви тримаєте API-типи у безпеці?

**A:** Зараз — TypeScript-інтерфейси руками + Zod-схеми для відповідальних відповідей. Це **слабке місце**: схеми описані, але парсинг на boundary не скрізь увімкнений (наприклад, у блог-API ми робимо `as` замість `.parse()`). Я б додав `.parse()` всюди + згенерував типи з OpenAPI бекенду через `openapi-typescript` або `Orval`. Це знімає ручну синхронізацію типів.

### Q6. Як ви уникаєте overfetching?

**A:** Це **природний мінус REST**. Я компенсую двома способами: бекенд віддає тонкі DTO для list-views (`BlogPostSchema` без `content` у списку, повний `BlogPost` тільки на детальній сторінці) і фронтенд робить ViewModel-маппінг для важких трансформацій. Якщо overfetching стане боттлнеком (мобілка, слабкі пристрої) — або переходимо на полі-flag параметри (`?fields=id,title`), або вибірково — на GraphQL для важких частин додатку.

### Q7. Як це масштабується в проді?

**A:** Кілька рівнів:
1. **Кеш на CDN/Next.js** — для public данних (`Cache-Control: s-maxage=60, stale-while-revalidate=30` у блог-роуті).
2. **TanStack Query** дедуплікує паралельні запити в браузері.
3. **Refresh-token mutex + failed queue** в `auth.ts` — 5 паралельних запитів з простроченим access не штампують 5 рефрешів, рефреш робиться один раз.
4. **BroadcastChannel** синхронізує login/logout між табами — користувач не залогінений в одній табі і анонім в іншій.
5. **Infinite query + virtual scroll** на `react-virtual` — список постів не рендерить 1000 DOM-нод одночасно.
6. **WebSocket з resilient retry** для live-частини (`useResilientWebSocket.ts`) — backoff із jitter, heartbeat timeout, intentional close handling.

---

## 10. Final Verdict

### Питання → Прямі відповіді

**Чи достатньо твого підходу для проду?**
Так, з двома застереженнями: треба ввімкнути Zod-парсинг на boundary і прибрати дублювання двох axios-інстанцій. Все інше — нормальний production-рівень.

**Чи достатньо для Strong Middle інтерв'ю?**
Так, але якщо ти прокачаєш відповіді з розділу 9 і зможеш чесно сказати про слабкі місця з розділу 4 (саме слабкі місця і знання як їх виправити — це те, що відрізняє Middle від Strong Middle). Просто "у мене працює" не пройде. "У мене працює, я знаю що ось ці три речі неправильно і ось як я б це виправив" — пройде.

**Чи зробить GraphQL + Apollo проєкт кращим?**
Ні. У тебе нема жодного драйвера для цього: один клієнт, REST бекенд, плоскі дані, мала команда. GraphQL добавить складність без бізнес-цінності. Якщо потім появиться mobile-клієнт або графовий домен — повертайся до питання.

**Що покращити першим?**
Порядок:
1. **Zod-валідація на boundary** (8.2) — закриє #1 ризик: silent breakages бекенду.
2. **Уніфікація axios-клієнта** (8.1) — закриє асиметрію auth flow.
3. **Перевірити баг з `/api/api/...`** (4.3) — швидко глянути в Network: чи реально працюють `getEmail` і `getInn`.
4. **Codegen з OpenAPI** (8.3) — знесе клас "забув оновити тип" як проблему взагалі.
5. **Уніфіковані query keys** (8.4) — підготовка до масштабу.

### Бали

- **Backend communication architecture: 62/100**
  - Шар є, він розмежований (api → hooks → ui). Мінус — два axios-клієнти, відсутність codegen, інлайн endpoint URL-и.
- **Type safety: 55/100**
  - TS добре, але рантайм-валідації фактично нема. Zod описано, не задіяно. Без codegen типи — джентльменська угода з бекендом.
- **Production readiness: 60/100**
  - Auth — 8/10 (mutex, BroadcastChannel, retry, cookies). Решта — 5-6/10. Є реальні баги (4.3, 4.7).
- **Interview strength: 70/100**
  - Auth-flow — це сильний матеріал для розповіді. TanStack Query + infinite scroll + virtual list — теж. Слабке: коли спитають про validation і codegen — треба чесно зізнатися і показати план.

### Підсумок одним реченням

Підхід — REST + TanStack Query + Axios — **правильний для цього проєкту**, реалізований **на твердий middle**, з очікуваним для рівня болем (Zod не парсить, два клієнти, інлайн ключі), і **не потребує переходу на GraphQL** — він би лише ускладнив життя без причини.
