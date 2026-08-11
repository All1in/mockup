# REST vs GraphQL — рішення для цього проєкту

**Роль:** Senior / Staff Frontend Engineer (10+ років, prod, highload, React/Next.js).
**Аналізований проєкт:** Next.js 16 (App Router) + React 19 + TanStack Query 5 + Axios + Express/Mongo backend. Auth — JWT у HttpOnly cookies з rotation. Контент: dashboard (overview, activity, users-by-country, BTC candles) + блог (mock-дані під Next Route Handlers).

> Я навмисно не пишу «загальне порівняння REST vs GraphQL». Усе нижче прив’язане до файлів цього репо.

---

## 1. Current Architecture Summary

Це чистий **REST + BFF (Backend-for-Frontend) гібрид**, де роль BFF частково виконує сам Next.js.

**Шари клієнта:**

- HTTP-клієнт №1 — `client/src/lib/api/api.ts:15`
  - `axios.create({ baseURL: '/api' або NEXT_PUBLIC_API_URL, withCredentials: true })`
  - Обгортає auth (`login`, `authMe`, `logout`), dashboard (`getDashboardOverview`, `getDashboardActivity`, `getDashboardUsersByCountry`, `getBtcUsdtCandles`), реєстрацію (multipart), валідацію `email/inn`.
- HTTP-клієнт №2 — `client/src/features/blog/api/blog.api.ts:5`
  - Окремий `axios.create({ baseURL: '/api', paramsSerializer: ... })`. Серіалізатор написано власноруч, бо потрібна `tags=a&tags=b` форма.
- Маршрутизація — `client/next.config.ts:22`
  - `rewrites()`: `/auth/*`, `/dashboard/*`, `/uploads/*`, `/health`, `/api/check-email`, `/api/check-inn`, `/api/register` → Express (`http://localhost:4000`).
  - `/api/blog/*` **навмисно не переписано** — обробляється Next Route Handlers (`client/src/app/api/blog/posts/route.ts:8`, `client/src/app/api/blog/categories/route.ts:5`).
  - Тобто Next виступає як локальний BFF-проксі для блогу (mock-дані `blog.mock.ts:331`).
- TanStack Query — `client/src/app/providers.tsx:16`
  - `QueryClient` з `staleTime: 60_000` за замовчуванням, переоверайди в окремих хуках.
  - Devtools у dev, AuthChannelSync інвалідовує `['me']` через `BroadcastChannel`.
- Хуки даних
  - Блог: `useInfiniteBlogPosts.ts:7` (`useInfiniteQuery`, offset/limit, `staleTime 60s`), `useBlogCategories.ts` (`staleTime 5min`), `useBlogPost.ts`.
  - Dashboard: `useDashboardOverview.ts`, `useDashboardActivity.ts` (з `keepPreviousData`), `useDashboardUsersByCountry.ts`, `useBtcUsdtCandles.ts` (`staleTime 15s`).
  - Auth: `useAuth.ts` (`['me']`, без retry).
- Auth-флоу — `client/src/lib/auth/auth.ts:194`
  - Axios interceptor на 401 → черга паралельних запитів → один `/auth/refresh` → ретрай.
  - Проактивний таймер refresh за 60с до експірації.
  - `BroadcastChannel('auth')` синхронізує login/logout/refresh між табами.
  - `visibilitychange`-handler підтягує токен, коли таб повертається у фокус.
- Валідація схем — Zod, але лише у блозі (`features/blog/lib/blog.schemas.ts`). Dashboard і auth — голі TS interfaces (`types/dashboardTypes.ts`, `types/apiTypes.ts`).
- Query keys — фабрика тільки для блогу (`features/blog/hooks/blog.keys.ts:6`). Dashboard-хуки використовують inline-масиви (`['dashboard-overview']`, `['dashboard-activity', page, rowsPerPage, q]`). Це непослідовно.

**Як тече дані:**

```
Browser
  └── Next.js (App Router)
         ├── Route Handlers (/api/blog/*)         → in-memory mock
         └── rewrites()
                ├── /auth/*                       → Express (Mongo)
                ├── /dashboard/*                  → Express (in-memory + Binance proxy)
                ├── /api/check-email|inn|register → Express
                └── /uploads/*                    → static
```

**Структурованість:** хороша. Feature-folder pattern (`features/blog/{api,hooks,lib,states,ui}`), розділені шари (api/hooks/UI), HTTP-кеш на Route Handlers (`s-maxage=60, stale-while-revalidate=30`), серверний featured post + клієнтський infinite scroll. Auth-флоу серйозно інженерований (race-safe refresh, BroadcastChannel). Це не junior-код.

---

## 2. Real Problems In Current Approach

Чесно: **жодних архітектурних проблем, які б розв’язував саме GraphQL, у цьому проєкті немає.** Натомість є дрібні гігієнічні борги REST-шару:

### 2.1 Дві окремі axios-інстанції з однаковим baseURL
`api.ts:15` і `blog.api.ts:5` обидві бʼють у `/api`, але мають різні `paramsSerializer`, різні політики помилок, різні interceptors (auth interceptor живе тільки на першій). Якщо завтра блог опиниться за auth — буде сюрприз.

### 2.2 Zod-схеми використано асиметрично
- Server side: `BlogPostsListResponseSchema.parse(...)` у `app/api/blog/posts/route.ts:34` ✅
- Client side: `return data as BlogPostsListResponse` у `blog.api.ts:25` ❌ — `as` каст без runtime-валідації.

Тобто схеми вже написані, але клієнт їх не вмикає на boundary. Це безкоштовний win, який не забрано.

### 2.3 Dashboard / auth узагалі без runtime-валідації
`types/dashboardTypes.ts` — голі interfaces. Якщо backend змінить контракт — впаде десь у глибині UI замість боундарі.

### 2.4 Inconsistency у query keys
- Блог: фабрика `blogKeys.posts() / .post(slug) / .infinitePosts(limit, filters)` ✅
- Dashboard: `['dashboard-overview']`, `['dashboard-activity', page, rowsPerPage, q]`, `['btc-usdt-candles', interval, limit]` — просто масиви.
Інвалідовувати точково через `queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() })` неможливо — фабрики нема.

### 2.5 Бойлерплейт try/catch у кожній API-функції
Кожна функція в `api.ts` обгорнута в `try { ... } catch (e) { throw toApiError(e); }`. 8 однакових блоків. Легко витягається в interceptor.

### 2.6 Немає кодогенерації типів з контракту
Контракти існують у двох місцях: TS-інтерфейси на клієнті + Express-handlers на сервері. Drift — питання часу. Нема OpenAPI / нема `openapi-typescript` / нема Orval.

### 2.7 Overfetching / underfetching — НЕМАЄ
Подивись на endpoints:
- `/dashboard/overview` віддає рівно `metrics + systemHealth + quickActions` — те що рендерить дашборд.
- `/dashboard/activity?limit=&offset=&q=` — пагінація + пошук.
- `/blog/posts?limit=&offset=&category=&tags[]=` — пагінація + фільтри + теги.
- `/blog/posts/[slug]` — повний пост (один екран = один запит).

Кожен ендпоінт уже **скроєний під свій UI-екран**. Це фактично pre-baked GraphQL-resolver, тільки на REST. Класичний BFF-патерн.

### 2.8 Складна композиція даних на фронті — немає
Я не знайшов у коді жодного місця, де компонент тягне 3+ ендпоінти і потім їх «зшиває». Найскладніше — `BlogPageView.tsx:36` з одним `useInfiniteBlogPosts` + дедупом по `id`. Це норма.

### 2.9 N+1 / waterfall — немає
SSR блогу робить рівно один синхронний виклик мокового джерела. CSR блогу — один infinite query. Dashboard — 4 паралельні незалежні query без waterfall.

**Підсумок:** проблем, які лікує GraphQL, у цьому коді немає. Є проблеми REST-гігієни — їх лікують значно дешевше за GraphQL.

---

## 3. GraphQL Value Analysis (PROJECT-SPECIFIC)

> Чи розв’яже GraphQL **реальні** проблеми **цього** проєкту?

**Коротка відповідь: ні.**

Розгорнуто, по болях, які зазвичай виправдовують GraphQL:

| Біль, який лікує GraphQL | Чи присутній тут | Доказ із коду |
|---|---|---|
| Overfetch (зайві поля від REST) | ❌ ні | Кожен ендпоінт повертає рівно те, що треба для свого екрану. |
| Underfetch (треба зшивати з 5 ендпоінтів) | ❌ ні | Найкомплексніше — `BlogPostsListResponse` з вже агрегованим `posts/total/limit/offset/hasMore`. |
| Багато клієнтів (web + iOS + Android + 3rd party) | ❌ ні | Один Next-клієнт. |
| Пермутації запитів (різні екрани = різні підмножини полів) | ❌ ні | Екранів небагато; форма даних стабільна. |
| Версіювання API без breaking changes | ❌ ні | Один внутрішній бекенд, прод-користувачів зовні нема. |
| Realtime з оптимістичним UI на багатьох доменних об’єктах | ❌ ні | Realtime лише на BTC-чарті через WebSocket — це **гірше** в GraphQL Subscriptions, ніж голий WS. |
| Self-documenting schema for зовнішніх інтеграторів | ❌ ні | Жодного зовнішнього споживача API. |

Що б GraphQL **погіршив** саме тут:

- Ускладнив auth-флоу. Зараз refresh interceptor живе на одному axios. У GraphQL — `Apollo Link` + `errorLink`, окремий refresh-flow для query/mutation, окрема логіка для subscriptions. Більше коду = більше місць помилитись.
- Вбив HTTP-кешування `Cache-Control: s-maxage=60, stale-while-revalidate=30` (`/api/blog/posts/route.ts:44`, `/api/blog/categories/route.ts:11`). GraphQL POST-and-pray кеш не вловить.
- Заміг би вже працюючу `useInfiniteQuery`-пагінацію на ручний merge `cache.modify` / `relayStylePagination` Apollo. Це чисто додаткова складність.
- Подвоїв розмір бандла. Apollo Client ≈ 33 kB gzip; urql ≈ 12 kB; зараз — `@tanstack/react-query` (~13 kB) + `axios` (~13 kB) і обидва вже тут стоять. Apollo поверх — це чистий додаток, не заміна.
- Наклав необхідність кодогенерації (`graphql-codegen`) для зняття типів. Те саме можна отримати з REST через `openapi-typescript` за 1 файл конфігу.

**Висновок розділу:** GraphQL **не вирішує** жодної конкретної проблеми цього коду. Він додає точки відмови там, де поточний REST уже стабільний.

---

## 4. REST vs GraphQL Comparison (REAL, NOT GENERIC)

| Критерій | Поточний REST + BFF | GraphQL (Apollo/urql) | Що краще ТУТ | Чому |
|---|---|---|---|---|
| Type safety | TS-interfaces; Zod лише в блозі. Drift можливий. | `graphql-codegen` дає end-to-end типи зі схеми. | Нічия | REST доганяє через `openapi-typescript` + Zod на boundary. Без кодогену — GraphQL виграє. |
| Data fetching flexibility | Ендпоінт-per-екран. Новий екран = новий ендпоінт. | Будь-який shape з однієї схеми. | GraphQL у **теорії**; REST **тут**. Усі екрани вже покриті. |
| Caching | TanStack Query + HTTP `s-maxage`/`SWR`. CDN/edge — з коробки. | In-memory normalized cache (Apollo). HTTP cache майже мертвий через POST. | **REST** | Edge-кеш блогу дає реальні мс економії. GraphQL це втратить. |
| Overfetching | Нема. Endpoints скроєні. | Можна попросити рівно потрібні поля. | Нічия | На цьому рівні форми даних — не релевантно. |
| DX (writing a feature) | `feature/api/*.ts` + `useQuery` хук + key factory. ~30 рядків. | Schema → codegen → operation → typed hook. ~40 рядків + конфіг кодогену + сервер. | **REST** | Менше кроків, менше інструментів у пайплайні. |
| Debugging | Network tab, кожен запит окремий URL, видно payload, видно cache headers. | Один URL, всі запити POST з body. Потрібен Apollo DevTools. | **REST** | Junior зайде у Network → одразу бачить, що зламалось. |
| Complexity (ops) | Express + Next routes. Без зайвих процесів. | Додатковий `graphql`-handler, schema, resolvers, DataLoader для N+1. | **REST** | Менше рухомих частин. |
| Performance (cold start) | 1 round-trip per screen (вже так). | 1 round-trip per screen (нічого не змінилось). | Нічия | На сабсекундних API економії ноль. |
| Scalability (по даних) | Кожен endpoint масштабується незалежно (CDN per route). | Один endpoint, навантаження концентрується. Потрібні persisted queries + APQ. | **REST** | Простіший capacity planning. |
| Team size fit | Один-двоє фронтів — REST виграє завжди. | Окупається від ~5+ продуктових команд + кількох клієнтів. | **REST** | Розмір команди тут — solo / small. |
| Learning curve | TanStack Query вже вивчено. Axios — стандарт. | Apollo + cache normalization + fragments + cache policies — окремий курс. | **REST** | Менше когнітивного навантаження. |
| Backend impact | Express вже написаний. | Треба загорнути у GraphQL-сервер або writeresolvers поверх Mongoose. | **REST** | Поточний Express `auth.controller.ts`/`auth.service.ts` уже працює. |

Підсумковий рахунок: **REST виграє 9/12, нічия 3/12, GraphQL не виграє жодного критерію в реалії цього проєкту.**

---

## 5. Production Reality

Як це вирішують у реальних компаніях (без хайпу):

**REST обирають коли:**
- Один продуктовий клієнт (web або mobile, не +інтегратори).
- Команда ≤ ~10 фронтів.
- Endpoints збігаються з UI-екранами (BFF-форма).
- Важлива HTTP-кешованість (CDN, edge, `Cache-Control`).
- Auth-флоу складний і не хочеться його ще раз винаходити для GraphQL.
- Немає вимоги «один API для багатьох публічних споживачів».

**GraphQL обирають коли:**
- Багато клієнтів (web + iOS + Android + watchOS + 3rd party).
- Великий монодомен з сотнями полів, де різні екрани вибирають різні підмножини (соцмережі, маркетплейси, CRM).
- Окрема платформенна команда, що володіє схемою.
- Federation / supergraph (Netflix, GitHub, Shopify Storefront, Airbnb).
- Вимога «дайте інтеграторам схему, нехай беруть що треба» (GitHub, Shopify, Hasura-style).

**Гібрид (REST + GraphQL) — найчастіший прод-патерн:**
- Зовнішній публічний API: REST (стабільність, кеш, простота для інтеграторів). Типовий приклад: Stripe.
- Внутрішній gateway для UI: GraphQL (Apollo Federation). Приклад: Netflix Studio Edge.
- Realtime: окремий WebSocket / SSE, **не** GraphQL Subscriptions у проді (вони прижились у малої частини великих компаній: GitHub так, Shopify ні).

Тренд 2024–2026: **GraphQL перестав бути «новим хайпом»**. Великі компанії, які в нього інвестували (Airbnb, Netflix, Shopify, Meta) — продовжують. Нові стартапи частіше беруть **tRPC** (для TS-моноліту) або **REST + OpenAPI + кодоген**. GraphQL adoption у ентерпрайзі стабілізувався, але не зростає так, як очікували у 2018–2020.

---

## 6. Industry Usage (чесно)

Орієнтовні цифри (State of API / Postman / GitHub language reports 2023–2025):

- REST: ~80–85% продакшн-API.
- GraphQL: ~25–30% компаній мають **хоча б один** GraphQL-сервіс. У більшості — поряд із REST.
- gRPC: ~10–15%, домінує у service-to-service.
- tRPC: швидкозростаючий у TS-екосистемі (Next/T3 stack), але переважно у малих/середніх продуктах.

**Де GraphQL панує:**
- **Big Tech / соцплатформи:** Meta (Facebook, Instagram), GitHub Public API v4, Shopify Storefront API, Airbnb internal.
- **Mobile-heavy:** додатки, де треба економити байти на клієнті з повільним 3G (Instagram, Twitter — використовували, потім частково повернули REST для пошуку/фідів).
- **B2B з відкритим API для інтеграторів:** GitHub, Shopify, Contentful, Hasura.

**Де REST дисципліновано домінує:**
- Платіжні API (Stripe, PayPal, Adyen).
- Інфраструктурні API (AWS, GCP, Azure).
- 90% стартапів у перші 2–3 роки.
- B2B SaaS, де клієнт — інший backend.
- Public APIs, де простота readability > flexibility (Twilio, SendGrid, Mailgun).

**Реальність:** «GraphQL замінить REST» — це 2018-й. У 2026-му обидва живуть і не заважають один одному.

---

## 7. Should I Switch?

### **NO. Не зараз і, ймовірно, ніколи в межах цього проєкту.**

**Чому:**
1. У коді нема жодного болю, який лікує GraphQL (див. розділи 2 і 3).
2. Поточний REST + BFF + TanStack Query + Zod — це **той самий результат**, що й GraphQL, тільки дешевший в обслуговуванні.
3. Auth-флоу (`auth.ts:194`) уже зрілий і складний; перенесення на Apollo Link — чистий регрес у часі.
4. Edge-кеш на Route Handlers (`s-maxage=60, stale-while-revalidate=30`) — реально працююча оптимізація. GraphQL її вб’є.
5. Команда мала; інструмент рівня GraphQL платить дивіденди тільки на масштабі.

**Ризики **переходу** (якби почали):**
- 2–4 тижні на установку Apollo + кодоген + переписування auth interceptor.
- Втрата HTTP-кешування для блогу.
- Втрата простоти debugging (Network tab → GraphQL playground).
- Ризик cache normalization багів (помилки `cache.modify` ламають UI без помилки в TS).
- Подвоєння бандла (Apollo або urql + усе, що вже стоїть).

**Cost vs Benefit:**

| Стаття | REST (зараз) | GraphQL (перехід) |
|---|---|---|
| Час впровадження | 0 (вже є) | ~3 тижні full-time |
| Time-to-feature | низький | спочатку зросте, потім ~рівний |
| Bundle | менше | +30–60 kB |
| Cache | edge ✅ | переважно in-memory |
| Auth refresh | один interceptor | переписувати |
| ROI | n/a | **негативний** на цій кодовій базі |

**Коли переходити мало б сенс:**
- З’явиться рідний мобільний клієнт (iOS/Android/RN), якому потрібна інша форма даних.
- З’явиться 3-й споживач API (наприклад, публічна інтеграція).
- Кількість UI-екранів і їх перетинів за полями виросте кратно (>50 екранів, >20 типів сутностей).
- Команда фронтів виросте до 5+ і з’явиться окрема API-команда.

Жодна з цих умов наразі не виконується.

---

## 8. If NOT Switching → Improvements (рекомендований план)

Конкретно і прив’язано до файлів:

### 8.1 Унифікувати axios-інстанції
Об’єднати `lib/api/api.ts:15` і `features/blog/api/blog.api.ts:5` в один shared client. Винести `paramsSerializer` із blog у спільний — auth-interceptor тоді покриє і блог.

### 8.2 Зробити Zod-валідацію симетричною
В `features/blog/api/blog.api.ts:23` замінити:
```ts
return data as BlogPostsListResponse;
```
на:
```ts
return BlogPostsListResponseSchema.parse(data);
```
Поширити підхід на dashboard: написати схеми у `types/dashboardTypes.ts` (або поряд) і парсити на boundary. Відмова від `as`-кастів.

### 8.3 Кодогенерація типів з контракту
- Найдешевший варіант: додати OpenAPI на Express (наприклад, `@asteasolutions/zod-to-openapi` — Zod → OpenAPI 3.1) і `openapi-typescript` на клієнті. Один build-step → клієнт завжди в синку з бекендом.
- Альтернатива (повніше): `Orval` — генерує і типи, і готові TanStack-Query-хуки (`useGetBlogPosts`).
- Якщо backend і frontend в одній repo з TS — розгляньте **tRPC** (буквально безкоштовний типобезпечний RPC; ближче до GraphQL за DX, але без жодних його недоліків).

### 8.4 Query Key Factories по всьому проєкту
Скопіювати патерн `features/blog/hooks/blog.keys.ts` для dashboard:
```ts
// hooks/dashboard.keys.ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  activity: (params: ActivityParams) => [...dashboardKeys.all, 'activity', params] as const,
  usersByCountry: () => [...dashboardKeys.all, 'users-by-country'] as const,
  candles: (interval: BtcCandleInterval, limit: number) =>
    [...dashboardKeys.all, 'candles', interval, limit] as const,
};
```
Замінити inline-масиви у `useDashboardOverview.ts:7`, `useDashboardActivity.ts:20`, `useDashboardUsersByCountry.ts:8`, `useBtcUsdtCandles.ts:7`. Це дає точкову інвалідацію (`invalidateQueries({ queryKey: dashboardKeys.all })`).

### 8.5 Стандартизувати error handling
Прибрати восьмиразовий `try { ... } catch (e) { throw toApiError(e); }` із `lib/api/api.ts`. Завести **response error interceptor**:
```ts
api.interceptors.response.use(r => r, e => Promise.reject(toApiError(e)));
```
API-функції стають однорядковими.

### 8.6 DTO → ViewModel mapping (де треба)
Прямо зараз DTO ≈ ViewModel — бо ендпоінти скроєні під екрани. Але `BlogPost.publishedAt: string` → у UI хочемо `Date` або форматований label. Винести в `lib/blog.mappers.ts` функції `toBlogPostVM()`. Це готує ґрунт під будь-яке майбутнє API (REST/tRPC/GraphQL — байдуже).

### 8.7 Pagination — зробити одну стратегію для всіх списків
Зараз `useDashboardActivity` — це класична page+rowsPerPage з `keepPreviousData`. Блог — `useInfiniteQuery` з offset/limit. Це нормально, але документуй: «таблиці — paged; стрічки — infinite».

### 8.8 Request deduplication
TanStack Query вже дедуплікує по `queryKey`. Додати — заборонити `axios` ретраї на 5xx у тих ендпоінтах, що мають `retry: false` у хуках (зайвий round-trip).

### 8.9 Мінорно: SSR-prefetch для dashboard
Дашборд зараз весь client-side. Можна dehydrate-ити `dashboard-overview` на сервері (`HydrationBoundary`) — перший paint без skeleton.

---

## 9. If Switching → Migration Plan

Якщо колись з’явиться mobile-клієнт або 3+ споживачі API, мінімально-ризикований шлях:

1. **Не переписувати все.** Поставити **GraphQL поверх існуючого Express** як thin gateway (наприклад, `mercurius` / `apollo-server` з resolvers, що бʼють у вже існуючі сервіси `auth.service.ts`, `dashboard.controller.ts`).
2. **Schema-first, не code-first.** Зафіксувати SDL у `server/graphql/schema.graphql`. Це робить контракт явним.
3. **Кодогенерація типів:** `graphql-codegen` з `typescript`, `typescript-operations`, `typescript-react-query` (плагін, який тримає TanStack Query, без переходу на Apollo).
4. **Стартувати з одного домену.** Найкандидат — Blog (мінімум stateful коду, кеш не критичний у мок-режимі).
5. **Auth — НЕ чіпати.** Залишити cookie-flow і `/auth/refresh` REST-овим. GraphQL gateway просто читає cookie.
6. **Клієнт:** **urql** (12 kB, простіший cache) > Apollo (33 kB) для цього розміру проєкту. Relay — overkill.
7. **Realtime:** залишити голий WebSocket для BTC chart. Не плутати з GraphQL Subscriptions.
8. **Не вмикати Federation/Supergraph до 5+ команд.**

**Ризики переходу:**
- Cache-normalization баги (тиха втрата UI-стейта).
- Втрата HTTP edge-кешу (`Cache-Control` на Route Handlers).
- Складніший observability (один URL, кілька operations).
- Persisted queries — обов’язково для CDN-кешу і безпеки (інакше зловмисник пише `query { ... }` довжиною в гігабайт).

**Бюджет:** 3–5 тижнів full-time однієї людини на 1 домен; ще 2–3 тижні на повну міграцію. Без чіткого ROI — не варто.

---

## 10. Interview Answer (Strong Middle / Senior)

### 10.1 «Чому ви обрали REST, а не GraphQL?»

> Ми обрали REST + BFF-стиль з TanStack Query і Zod-валідацією на boundary. Причини конкретні:
> - У нас один web-клієнт і немає mobile/3rd-party споживачів — основний тригер GraphQL відсутній.
> - Endpoints у нас уже скроєні під екрани (`/dashboard/overview`, `/blog/posts?limit&offset&category&tags[]`), тому overfetch чи underfetch ми не маємо.
> - HTTP-кешування на edge (`Cache-Control: s-maxage=60, stale-while-revalidate=30`) для блогу дає реальний виграш на TTFB; GraphQL POST його руйнує без persisted queries.
> - Auth-флоу з token rotation, race-safe refresh queue і BroadcastChannel між табами я вже мав на одному axios-interceptor’і; перенесення на Apollo Link було б чистим регресом без бізнес-вигоди.
> - Тип-безпеку ми отримуємо через Zod на boundary і плануємо OpenAPI-кодоген — це той самий результат, що і `graphql-codegen`, без серверної complexity GraphQL.
> Тобто REST тут — це **не** «не дотягнули до GraphQL», а свідомий вибір, заснований на профілі продукту.

### 10.2 «Коли б ви перейшли на GraphQL?»

> Коли з’явиться хоча б одне з:
> 1. Другий-третій клієнт API (мобільний, інтегратори).
> 2. Кількість UI-перетинів за полями виросте — різні екрани хочуть різні підмножини полів одних і тих самих сутностей.
> 3. Виникне потреба у federation/supergraph поверх кількох сервісів.
> 4. Команда виросте до рівня, де окрема API-команда володіє схемою.
> Якщо нічого з цього нема — перехід коштує дорого, а виграє нуль.

### 10.3 «Які тут tradeoffs?»

> REST:
> - **+** простота, debugging у Network tab, edge-кеш, мінімум залежностей.
> - **−** drift контрактів, якщо нема кодогену; ризик «N+1 ендпоінтів» при швидкому зростанні.
>
> GraphQL:
> - **+** гнучкість для багатьох клієнтів, self-documenting schema, точніший fetch на mobile.
> - **−** складніший кеш, складніший auth, втрата HTTP-кешування, бандл, потреба у persisted queries для безпеки/perfа, складніший debugging.
> Найчесніше — у проді часто живуть **обидва**: публічний API REST, внутрішній gateway GraphQL.

### 10.4 «Як ваше рішення масштабується?»

> Три осі:
> - **Дані:** TanStack Query дедуплікує запити, тримає stable cache keys через factory, edge-кеш на Route Handlers зменшує навантаження на Express.
> - **Команда:** feature-folder pattern (`features/blog/{api,hooks,ui,states}`) — нові домени додаються без правок існуючих.
> - **Контракти:** план — додати OpenAPI з Zod-схеми + `openapi-typescript`. Це усуває drift без переходу на GraphQL.
>
> Якщо продукт раптово стане multi-client — є чіткий incremental план: GraphQL-gateway поверх існуючого Express, починаючи з одного домену, без ламання auth.

---

## 11. Final Verdict

| Метрика | Оцінка |
|---|---|
| Architecture quality | **82 / 100** |
| Scalability | **74 / 100** |
| DX | **78 / 100** |
| Interview strength | **84 / 100** |

### Розшифровка
- **Architecture quality (82):** хороший feature-folder, чітко розділені шари, грамотний auth-флоу, edge-cache на BFF. Мінуси: дві axios-інстанції, асиметричне використання Zod, нема query key factory у dashboard, нема кодогену.
- **Scalability (74):** з даних — норм (REST + edge cache). З команди — добре. Мінуси: drift-ризик контрактів без OpenAPI/Zod-симетрії; немає чіткої DTO→VM межі.
- **DX (78):** TanStack Query Devtools, типобезпечні хуки, чисте API. Мінус: бойлерплейт try/catch, inline query keys у dashboard.
- **Interview strength (84):** ти можеш чесно і впевнено пояснити **чому REST**, а не «бо так вийшло». Це сильніше за «я переписав на GraphQL».

### 👉 Чи цього достатньо для Middle / Strong Middle frontend?

**Так, цього достатньо для Strong Middle, і впритул до Senior** — за умови, що на інтерв’ю ти:

1. Поясниш **production reasoning** (не «GraphQL краще/гірше» взагалі, а «у нашому профілі — REST, бо…»).
2. Покажеш auth-flow як інженерну зрілість (race-safe refresh queue, BroadcastChannel, visibility refresh — це не junior-патерни).
3. Назвеш **слабкі місця** першим (асиметричний Zod, drift контрактів, дві axios-інстанції) і **план їх виправлення** (OpenAPI codegen, query key factory, єдиний клієнт). Senior — це той, хто бачить власні борги.
4. Уникнеш хайпу: «GraphQL — це не завжди upgrade; tRPC — не завжди заміна; вибір залежить від профілю клієнтів і команди».

**Що додати, щоб упевнено зайти в Senior:**
- OpenAPI / `openapi-typescript` (або tRPC, якщо backend TS).
- Zod-валідація на boundary всюди, не тільки в блозі.
- Query Key Factory консистентно по всьому коду.
- Один axios-клієнт + interceptor для error normalization.
- SSR prefetch + `HydrationBoundary` для dashboard.
- Тестове покриття API-шару (vitest + msw).

---

## RULES — самоперевірка

- ✅ Ніяких загальних блог-style пояснень GraphQL.
- ✅ Реальні файли проєкту з рядками: `lib/api/api.ts:15`, `features/blog/api/blog.api.ts:5`, `next.config.ts:22`, `auth.ts:194`, `BlogPageView.tsx:36`, тощо.
- ✅ Критика поточного коду (асиметричний Zod, дві axios-інстанції, inline query keys, try/catch boilerplate).
- ✅ Production-reasoning, не теорія.
- ✅ GraphQL **не рекомендовано** — і це чітко обґрунтовано.