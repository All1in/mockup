# Auth Flow — Глибокий розбір та production-review

> Роль: Senior Frontend / ментор. Пишу так, щоб Junior зрозумів логіку, але оцінюю код по-сеньйорськи.
> Файли цитую з реального проєкту, нічого не вигадую.

---

## 1. Огляд auth-флоу (що реально відбувається)

У проєкті авторизація побудована як «гібрид»:

- **Sign-in** — через **Server Action** (`signInAction`). Запит до бекенду йде з сервера Next, кукі парсяться вручну і кладуться у відповідь Next через `cookies()`.
- **Sign-up** — через **TanStack Query mutation** прямо з клієнта (`registerMultipart`), потім **авто-логін** викликом `login()` з `api.ts`.
- **Refresh** — у клієнті, через **axios-інтерсептор** + **таймер** + **BroadcastChannel** для синхронізації між вкладками.
- **Захист сторінок** — двома механізмами одночасно:
  1. **Edge middleware** (`src/middleware.ts`) — перевіряє наявність кукі `access_token` для `/welcome/:path*`.
  2. **Client-side `<PrivateRoute>`** — викликає `/auth/me`, якщо помилка — редірект на `/sign-in`.

### 1.1. Покрокова схема (Sign-in через email/password)

```
[SignInForm.onSubmit]
   │
   ├─► react-hook-form + zod (signInSchema) валідують поля на клієнті
   │
   ├─► startTransition(() => dispatch(formData))
   │       │
   │       ▼
   │   [signInAction] (Server Action, 'use server')
   │       │ 1) safeParse(signInSchema)
   │       │ 2) fetch(BACKEND_URL + '/auth/login') з AbortController на 10с
   │       │ 3) парсить Set-Cookie заголовки рядок за рядком (parseCookieString)
   │       │ 4) cookieStore.set(...) — кукі повертаються в браузер у HTTP-відповіді
   │       │ 5) повертає { status: 'success', accessExpiresIn }
   │       ▼
   ├─► useActionState оновлює actionState
   │
   ├─► useEffect: actionState.status === 'success'
   │       │
   │       ├─► initAuthSession(accessExpiresIn)
   │       │     ├─ setTokenExpiresAt → localStorage('auth_exp')
   │       │     ├─ scheduleRefreshTimer(expires - 60s)
   │       │     └─ authChannel.postMessage({ type:'login', expiresIn })
   │       │
   │       └─► router.push(callbackUrl || '/welcome')
   │
   ▼
[Middleware /welcome/:path*]
   │ access_token cookie присутня → NextResponse.next()
   ▼
[Welcome page → PrivateRoute → useAuth → GET /auth/me]
   │ дані юзера в кеш React Query, рендериться UI.
```

### 1.2. Покрокова схема (Sign-up)

```
[SignUpForm — 3 кроки: PersonalData → AccountType → Confirmation]
   │
   ├─► registerMutation.mutateAsync(registerMultipart)
   │     POST /api/register (multipart/form-data)
   │     ※ функція ловить axios-помилку і ПОВЕРТАЄ { error, field } як «успіх»
   │
   ├─► handleRegisterResponse:
   │     if ('userId' in resp) {
   │        await login(email, password)   // авто-логін через api.ts → POST /auth/login
   │        router.push(callbackUrl || '/welcome')
   │     } else {
   │        setServerFieldError(...)
   │        setActiveStep(stepForField(field))
   │     }
   ▼
```

> ⚠️ **Важливий нюанс**: `login()` з `api.ts` НЕ викликає `initAuthSession` і не вмикає refresh-таймер.
> Після авто-логіну юзер тимчасово в стані «куки є, але клієнтський таймер не запущений».
> Це потенційна дірка (див. розділ 6).

### 1.3. Logout

```
[WelcomeClientContent → Button → logoutMutation.mutate(logout)]
   │ POST /auth/logout
   ├─► onSuccess: queryClient.removeQueries(['me']); window.location.replace('/sign-in')
   └─► onError: те ж саме (бекенд міг бути недоступний — все одно «вийти»)

axios response interceptor бачить url '/auth/logout' →
   clearRefreshTimer(); clearPersistedExpiry();
```

> ⚠️ **Logout НЕ постить у `BroadcastChannel`** — тобто інші вкладки не дізнаються, що юзер вийшов.
> Вони продовжать тримати таймер refresh і дізнаються про logout лише коли refresh поверне 401.

### 1.4. Auto-refresh

Три тригери refresh:

1. **Таймер** — через `expires - 60s` після логіну/refresh.
2. **Visibility change** — коли вкладка стає видимою і до експірації лишилось ≤ 30с — refresh одразу.
3. **Реактивно (axios interceptor)** — будь-який API-запит, що повернув 401 (крім `/auth/login`, `/auth/register`, `/auth/logout`), запускає refresh, ставить запит у чергу `failedQueue`, потім ретраїть.

---

## 2. Розбір по файлах

| Файл | Відповідальність |
|------|------------------|
| `src/lib/auth/auth.ts` | Серце клієнтської auth-логіки: refresh-таймер, axios interceptor, BroadcastChannel, persisted expiry |
| `src/lib/api/api.ts` | axios-інстанс + методи (login, authMe, logout, registerMultipart, getEmail, getInn, dashboard…) |
| `src/app/actions/auth.actions.ts` | Server Action для sign-in: парсинг Set-Cookie, forward до браузера |
| `src/components/auth/SignInForm.tsx` | Форма входу: react-hook-form + zod + useActionState |
| `src/components/auth/SignUpForm.tsx` | 3-кроковий wizard sign-up + авто-логін після успіху |
| `src/components/auth/PrivateRoute.tsx` | Клієнтський «шлюз»: useAuth → редірект, якщо 401 |
| `src/components/auth/SocialAuthButtons.tsx` | OAuth-редірект (Google працює, Facebook — кнопка є, обробника немає) |
| `src/components/auth/AuthCard.tsx` / `AuthContainer.tsx` / `AuthFooterLink.tsx` | UI-обгортки |
| `src/middleware.ts` | Edge-middleware: гейт по cookie для `/welcome/:path*` |
| `src/hooks/useAuth.ts` | TanStack Query до `/auth/me` |
| `src/hooks/useRouter.ts` | Утиліта `useAuthRedirect` (⚠️ названа як хук, але викликається з не-компонента — Rules of Hooks!) |
| `src/utils/signInSchema.ts` | zod-схема для sign-in (email + password ≥ 8) |
| `src/utils/signUpStepSchemas.ts` | zod-схеми для трьох кроків + дискриміноване поле `accountType` |
| `src/utils/Error.ts` | `ApiError` клас + `toApiError()` мапер axios → ApiError |
| `src/types/apiTypes.ts` | Типи: `AuthUser`, `AuthResponse`, `RegisterMultipartPayload`, `AuthChannelMessage` |
| `src/app/(auth)/layout.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx` | Сторінки auth-сегмента (route group) |
| `src/app/@modal/(.)sign-in/page.tsx`, `(.)sign-up/page.tsx` | Parallel route + intercepting route — модалки sign-in/sign-up з `/blog` |
| `next.config.ts` | rewrites: `/auth/*` → бекенд, `/api/register` → бекенд (`/auth` НЕ під `/api`!) |
| `src/components/welcome-dashboard/WelcomeClientContent.tsx` | Споживач PrivateRoute + logout |

> Те, чого **немає** і що варто було б мати:
> - `signUpAction` (server action) — sign-up іде повз сервер, відповідно і кукі ставляться повз `cookies()` API.
> - Окремого `auth.types.ts` — типи розкидані по `apiTypes.ts`.
> - Тестів — взагалі.

---

## 3. Глибокий розбір `auth.ts`

### 3.1. Таблиця функцій

| Функція | Що робить | Вхід | Вихід | Де використовується | Чому потрібна |
|---------|-----------|------|-------|---------------------|---------------|
| `getApiBaseUrl()` | Повертає абсолютний URL до API (для `window.location.href = ...`) | — | `string` | `SocialAuthButtons.handleGoogleClick` | OAuth-редіректи мають бути абсолютними URL |
| `setTokenExpiresAt(s)` | Зберігає момент експірації у пам’ять і `localStorage` | `expiresInSeconds: number` | `void` | внутрішньо + експорт (не використовується ззовні безпосередньо в проєкті) | Дозволяє відновлювати таймер після перезавантаження вкладки |
| `clearPersistedExpiry()` | Чистить пам’ять і `localStorage` | — | `void` | `clearSessionLocally`, interceptor on logout | Уникнути «фантомного» refresh-таймера після logout |
| `initAuthSession(s)` | Старт сесії на клієнті: ставить таймер + повідомляє інші вкладки | `expiresInSeconds: number` | `void` | `SignInForm` після успіху server action | Активує клієнтські побічні ефекти sign-in |
| `clearRefreshTimer()` | `clearTimeout` для запланованого refresh | — | `void` | повсюди | Уникнути зайвих refresh, race-conditions |
| `scheduleRefreshTimer(s)` | Планує POST `/auth/refresh` за `s-60` сек | `expiresInSeconds: number` | `void` | сам себе рекурсивно + `init`, `onVisibilityChange`, restore from localStorage | Проактивний refresh, щоб не ловити 401 |
| `clearSessionLocally()` | Чистить таймер + `localStorage` + редіректить на `/sign-in?callbackUrl=...` | — | `void` | `onSessionExpired`, BroadcastChannel `logout` | Локальна реакція на «сесія померла» |
| `onSessionExpired()` | Емітить `logout` у BroadcastChannel + `clearSessionLocally` | — | `void` | refresh-помилка 401 в таймері/інтерсепторі | Розповсюдити «вилогінено» по вкладках |
| `processQueue(error)` | Резолвить/реджектить запити, що чекали на refresh | `unknown` | `void` | `doRefresh` then/catch | Розблокувати чергу запитів, що паралельно отримали 401 |
| `isRefreshConcurrentError(err)` | Перевіряє: 409 + code `REFRESH_CONCURRENT` | `AxiosError` | `boolean` | `doRefresh` | Бекенд може повернути «зараз інший клієнт refresh-ить» — треба зачекати і ретраїти |
| `getRetryAfterMs(err)` | Парсить `Retry-After` заголовок | `AxiosError` | `number` (мс) | `doRefresh`, scheduleRefreshTimer (помилка) | Поважити серверний бекоф |
| `sleep(ms)` | `setTimeout`-обгортка в Promise | `number` | `Promise<void>` | `doRefresh` | Чекати між ретраями |
| `onVisibilityChange()` | Якщо вкладка видима і до експірації < 30с → refresh | — | `void` | `document` listener | Користувач повернувся з іншої вкладки — токен міг встигнути протухнути |
| `authChannel.onmessage` | Обробка крос-tab подій `login`/`logout`/`refreshed` | `MessageEvent` | `void` | `BroadcastChannel('auth')` | Синхронізація стану між вкладками одного origin |
| `api.interceptors.response.use` (success) | На відповідях `/auth/register` і `/auth/refresh` ставить таймер | `AxiosResponse` | `AxiosResponse` | axios-інстанс | Автоматично «вмикає» сесію після register/refresh |
| `api.interceptors.response.use` (error) | На 401 від не-auth ендпойнтів робить refresh + retry оригінального запиту, з чергою на конкурентні запити | `AxiosError` | `Promise<AxiosResponse>` | axios-інстанс | Ядро seamless-UX: користувач не бачить 401, ми тихо оновлюємо токен |

### 3.2. Деталі по кожній функції (простими словами)

**`getApiBaseUrl()`** — на сервері повертає `API_BASE` (порожній рядок, якщо це `/api`); на клієнті — `window.location.origin + '/api'`. Потрібна, бо OAuth-перенаправлення (`window.location.href = ...`) вимагає абсолютний URL. Якщо приберемо — соц-кнопки зламаються в SSR/preview-режимах, де `location.origin` ще немає.

**`setTokenExpiresAt(s)`** — рахує `Date.now() + s*1000` і запам’ятовує і у змінній модуля, і у `localStorage` (під ключем `auth_exp`). Чому в обох місцях? У змінній — для швидкого доступу зараз; у localStorage — щоб після reload відновитись (нижче, на рядку 162-174 є init-блок). Якщо приберемо `localStorage` — після перезавантаження вкладки таймер не відновиться, і клієнт ловитиме 401 → спрацьовує retry, але це менш elegant.

**`scheduleRefreshTimer(s)`** — найважливіша функція. Запитує `/auth/refresh` за `s - 60s` (з мінімумом 1 сек). Плюси: проактивно. Мінуси: 60-секундний буфер хардкоднутий, не береться з env. Якщо бекенд видає токен на 30 секунд (тестове середовище) — `Math.max(s - 60, 1) = 1` → refresh піде через секунду, нескінченний цикл. Не критично, але не елегантно.

**`clearSessionLocally()`** — чистить локальний стан і робить редірект з `callbackUrl`. **Тут є серйозний баг**: викликає `useAuthRedirect(...)` — функцію, що сама всередині використовує `useRouter()` хук. `useAuthRedirect` написана як «хук» (`use`-prefix), але насправді використовується з НЕ-компонентного контексту (наприклад, з обробника помилки в інтерсепторі або з `setTimeout`). Це порушує Rules of Hooks і в production-збірці React викине `Invalid hook call`. Деталі — у розділі 6 і 7.

**`onSessionExpired()`** — пара рядків, що поєднують broadcast і local cleanup. Маленька функція, але семантично важлива — гарний приклад «команди» (Command pattern) у функціональному стилі.

**`processQueue(error)`** — реалізує паттерн «черга очікувань на refresh». Коли йде refresh, інші 401-запити не запускають другий refresh, а кладуть свої `resolve`/`reject` у `failedQueue`. Після завершення — масово розвантажуються. Без цієї функції було б N паралельних refresh-ів (а бекенд має token rotation — другий refresh з тим же токеном поверне 401).

**`isRefreshConcurrentError`/`getRetryAfterMs`/`sleep`** — інфраструктура для м’якої обробки гонок з боку бекенду. Якщо бекенд каже 409 `REFRESH_CONCURRENT` → читаємо `Retry-After`, спимо, ретраїмо ОДИН раз. Це якраз ознака «дорослого» auth-клієнта.

**`onVisibilityChange()`** — UX-плюшка. Користувач поклав вкладку на 5 хв, повернувся — ми НЕ чекаємо першого 401, а самі оновлюємо токен.

**`authChannel.onmessage`** — корисна для UX річ: в одній вкладці зайшли — в іншій таймер автоматично переставляється. В одній вийшли — в іншій теж відбувається cleanup. **Але тут небезпека повторного broadcast loop**: коли вкладка А отримує `login` з вкладки Б, вона викликає `setTokenExpiresAt` без `postMessage`. Добре, циклу немає. ✅

**Top-level side-effects** (рядки 146-178): module з імпорту запускає side-effects. Гарди `typeof window !== 'undefined'` і `typeof document !== 'undefined'` присутні — SSR/RSC не зламаються. Але цей файл імпортується в `SignInForm` і `SocialAuthButtons` — обидва `'use client'`. Все ок, але **порядок імпорту критичний**: якщо хтось випадково заімпортує `auth.ts` із серверного коду — гарди врятують, але реєстрація axios-інтерсептора не відбудеться (axios-інстанс сам шарений).

**Response-interceptor (success)** — реагує на `/auth/register` і `/auth/refresh`, ставить таймер. **`/auth/login` тут НЕ оброблений**. Це дисбаланс: server-action sign-in викликає `initAuthSession` руками; sign-up auto-login (`login()` з api.ts) — НЕ викликає, і інтерсептор теж його не ловить. Результат: після авто-логіну з sign-up таймер refresh не стартує, поки користувач не зробить будь-який інший запит, що поверне 401. Баг.

**Response-interceptor (error)** — класичний `axios refresh retry`-паттерн з купою захистів:
- ігнорує запити без `error.config` (мережеві помилки axios v1)
- ігнорує `/auth/login`, `/auth/register`, `/auth/logout` — щоб не зациклювати
- ігнорує не-401 і запити без response (network error)
- спеціально обробляє 401 від `/auth/refresh` (якщо сам refresh провалився — все, logout)
- захищається від нескінченних retry прапорцем `_retry`
- черга для конкурентних запитів через `failedQueue`

Загалом — рівень «крутого Middle / молодого Senior». Є нюанси (див. далі), але архітектурно правильно.

### 3.3. Side-effects та async-поведінка
- Top-level side-effects: ✅ guard-и є.
- `BroadcastChannel` створюється один раз при імпорті модуля.
- `localStorage` пишеться у `try/catch {}` — добре (Safari Private Mode).
- Жодних `unhandled promise rejection`: усі `then(...).catch(...)`.
- `refreshTimerId` гасить попередній таймер у `clearRefreshTimer()`.

### 3.4. Безпекові імплікації
- Кукі — HttpOnly (ставить бекенд) → JS не має до них доступу. ✅
- В клієнт ми зберігаємо ЛИШЕ `auth_exp` (число) — це не secret, тут все ок. ✅
- BroadcastChannel працює тільки в межах одного origin — не leak-ає крос-доменно. ✅
- `Retry-After` парситься як `parseInt` — захищено від NaN через `Number.isFinite`. ✅
- `localStorage` доступний через XSS — але `auth_exp` не дає атакеру нічого корисного. ✅

---

## 4. Доступний функціонал auth

| Фіча | Існує? | Якість | Коментар |
|------|--------|--------|----------|
| Login (email/password) | ✅ | 8/10 | Server action, нормальна валідація, абортконтролер, чітка дискримінована action-state |
| Sign up (email/password) | ✅ | 6/10 | Multi-step, але архітектурно НЕузгоджений зі sign-in (клієнтська мутація замість server action), типи через `as any` |
| OAuth Google | ✅ | 7/10 | Працює (бекенд тримає state). Клієнт лише робить `window.location.href` |
| OAuth Facebook | ❌ | — | Кнопка є, `onClick` — НЕМАЄ. Просто не працює. |
| Logout | ✅ | 7/10 | Викликає бекенд + чистить React Query + редірект. **Не постить у BroadcastChannel** — інші вкладки не вилогінюються одразу |
| Session check (`/auth/me`) | ✅ | 7/10 | TanStack Query, `retry: false`, `staleTime: 60s` (з global config). Без `refetchOnMount` — теоретично може показати застарілого юзера до 60с |
| Protected routes | ✅ | 6/10 | Two-layer (middleware + PrivateRoute), але middleware покриває **тільки** `/welcome/*`. Інші чутливі сторінки гейтить лише клієнт |
| Redirect after login | ✅ | 7/10 | `callbackUrl` підтримується, але є open-redirect (див. розділ 6) |
| Refresh token | ✅ | 8/10 | Таймер + interceptor + visibilitychange + конкурентна черга — це «дорослий» рівень. Мінус — sign-up auto-login не активує таймер |
| Remember me | ❌ | — | Чекбокс «Remember me» є в UI, але `register('remember')` його не зачитує і нікуди не відправляє. Декорація. |
| Form validation | ✅ | 8/10 | Zod на клієнті + Zod safeParse у server action. Стандарт галузі. |
| Error display | 🟡 | 5/10 | Sign-in: один `Typography color="error"` під формою. Sign-up: `serverFieldError` крутиться по кроках, але через `as any` і `nonce: Date.now()` для ремаунту — читання важке. |
| Loading states | 🟡 | 5/10 | Sign-in: `isPending` з action — ок. PrivateRoute: інлайнова `Loading...` без a11y-атрибутів. AuthCard / SignInForm-обгортки в Suspense, але fallback просто текст. |
| CSRF protection | ⚠️ | — | Покладається на `SameSite=strict` (бекенд). Anti-CSRF token-а немає. Прийнятно для cookie-only flow. |

---

## 5. Junior-friendly пояснення (ментальна модель)

Уяви, що auth — це бар з фейс-контролем:

1. **Sign-up = ти приходиш уперше, заповнюєш анкету, охорона видає тобі браслет.**
   У коді: `registerMultipart` шле дані. Бекенд створює юзера → ставить тобі **HttpOnly-кукі**. Кукі — це й є браслет. JS на сторінці його не бачить, тільки браузер сам автоматично надсилає його з кожним запитом.

2. **Sign-in = ти показуєш ID, охорона надягає тобі новий браслет.**
   У коді: `signInAction` (server action) йде до бекенду, отримує Set-Cookie, перекладає його у відповідь Next, який віддає браузеру. Все — браслет на руці.

3. **`/auth/me` = «гей, бармене, нагадай мені моє ім’я».**
   У коді: `useAuth()` через TanStack Query. Бекенд читає кукі, повертає `{ user }`. Ми кладемо в кеш — і всі компоненти, що викликають `useAuth()`, отримують готового юзера.

4. **Refresh token = браслет тимчасовий, його треба міняти.**
   У коді: `scheduleRefreshTimer` сам собі планує оновлення «за хвилину до закінчення». Як годинник нагадує тобі, що пора йти до бару міняти браслет.

5. **Middleware = охорона перед VIP-зоною.**
   У коді: `src/middleware.ts` дивиться на `/welcome` і питає «чи є кукі?». Якщо ні — кидає на `/sign-in?callbackUrl=...`.

6. **PrivateRoute = додатковий бармен, що перепитує особисто.**
   У коді: компонент сам викликає `/auth/me`. Якщо там 401 — `window.location.replace('/sign-in')`. Подвійний захист на випадок, якщо middleware пропустила (наприклад, кукі є, але бекенд її вже відкликав).

7. **BroadcastChannel = всі бармени з рацією.**
   У коді: одна вкладка вилогінилась → всі дізнаються через канал `'auth'` і самі чистять стан.

8. **axios interceptor = «бармен пробачає одну спробу».**
   У коді: якщо API відповіло 401 — клієнт не показує помилку юзеру, а тихо робить refresh і повторює оригінальний запит. UX: юзер навіть не помітив.

---

## 6. Production review (Senior-перспектива)

Оцінюю строго. Жирним — реальні баги, не «можна було б».

### 6.1. 🔴 Критичні

**🔴 [BUG] `useAuthRedirect` ламає Rules of Hooks.**
`src/hooks/useRouter.ts`:
```ts
export const useAuthRedirect = (route: string) => {
    const router = useRouter();   // ← хук
    return () => router.push(route);
};
```
Викликається з `auth.ts:84`, з `clearSessionLocally()` — це звичайна функція модуля, не компонент. У runtime React задетектить «Invalid hook call» (особливо у dev). У prod-збірці поведінка undefined. Треба переписати на звичайну функцію через `next/navigation`-роутер з компонента, або глобальний `window.location.replace`.

**🔴 [BUG] Open-redirect через `callbackUrl`.**
`SignInForm.tsx:57`:
```ts
const isSafe = callbackUrl && callbackUrl.startsWith('/') && callbackUrl !== '/sign-in';
router.push(isSafe ? callbackUrl : '/welcome');
```
Перевірка `startsWith('/')` пропускає **protocol-relative URL** виду `//evil.com/x` — браузер інтерпретує як `https://evil.com/x`. Тобто атакер може заслати посилання `/sign-in?callbackUrl=//evil.com/phish` — після успішного логіну юзер потрапить на чужий сайт. Це класична **open-redirect** уразливість.
**Фікс**: `callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')`. Те саме у `SignUpForm.tsx:93`.

**🔴 [BUG] Sign-up auto-login не активує refresh-таймер.**
`SignUpForm.tsx:76` викликає `await login(...)` з `api.ts`. Інтерсептор у `auth.ts:192` ловить тільки `/auth/register` і `/auth/refresh`, **не `/auth/login`**. У SignInForm цей дефект компенсує `initAuthSession` руками. Тут — ні. Результат: після успішного sign-up клієнтський таймер не запускається. Перший 401 спрацює тригером для retry-flow, але до того моменту token уже може бути протухлим, і поведінка — «застрягла» вкладка з невидимим refresh-ом тільки після наступного API-запиту.
**Фікс**: викликати `initAuthSession(resp.accessExpiresIn)` після `login()`, або (краще) обробити `/auth/login` в success-інтерсепторі.

**🔴 [BUG] Logout не транслюється у BroadcastChannel.**
`WelcomeClientContent.tsx:59-66` чистить React Query і ро­бить `location.replace`. Але `authChannel.postMessage({ type:'logout' })` ніколи не викликається. Інші вкладки лишаться з активним таймером, ходитимуть refresh-ом, бекенд відкине 401 — і тільки тоді вони зрозуміють. Прийнятно, але не consistent з рештою дизайну, де `BroadcastChannel` явно вживається.
**Фікс**: винести logout у `auth.ts` як `function logoutEverywhere()` і викликати `authChannel.postMessage({ type:'logout' })` перед `clearSessionLocally`.

### 6.2. 🟡 Важливі

**🟡 Архітектурний дисбаланс: sign-in — server action, sign-up — клієнтська мутація.**
Це навіть не «погано», просто неконсистентно. Sign-in отримує Set-Cookie через `cookies()` API на сервері, що дає чисту інтеграцію з RSC. Sign-up іде прямо на бекенд через `next.config.ts` rewrite. Кукі прилітають у відповідь на цей самий запит — теж працює, але SSR-спостерігач не може використовувати ці кукі для початкового рендеру одразу після sign-up. **Рекомендація**: завести `signUpAction` дзеркально до `signInAction`.

**🟡 Middleware покриває лише `/welcome/:path*`.**
`src/middleware.ts:16-18`. Якщо завтра з’явиться `/dashboard` чи `/profile` — гейт буде лише клієнтський (PrivateRoute). Гірше: між першим рендером сторінки і `useAuth()` може миготнути контент. Розширити matcher.

**🟡 Cookie-парсер у server action — вручну.**
`auth.actions.ts:11-37` — самописний парсер `Set-Cookie`. Це працює, але не ловить edge-cases (цитати, спецсимволи, multiple-domains). Краще використати `cookie` пакет (вже tree-shake-friendly) або `headers().getSetCookie()` + офіційний `parseSetCookie` з `next/server` (зʼявився у Next 15).

**🟡 Race в `signInAction` + `initAuthSession`.**
Server action ставить кукі. Клієнт у `useEffect` викликає `initAuthSession`. Між цими моментами може статися наступний запит з форми (наприклад, якщо користувач не дочекався і ще раз тицьнув на щось). Малоймовірно, але існує. Це загальна проблема useActionState + clientSideEffects — як мінімум, варто заблокувати всю форму поки `actionState.status !== 'success'` НЕ переведений.

**🟡 PrivateRoute робить hard-reload на `/sign-in`.**
`window.location.replace('/sign-in')` втрачає весь client-state, всю історію. Краще `router.replace('/sign-in?callbackUrl=...')`. І знову треба передавати `callbackUrl`, чого PrivateRoute не робить.

**🟡 «Remember me» — мертвий чекбокс.**
`SignInForm.tsx:127-128`. Не передається в action, не впливає ні на що. Або викинути, або реалізувати (на бекенді — довший термін refresh-токена).

**🟡 `RegisterMultipartResponse` ловить помилки і повертає їх як «успіх».**
`api.ts:137-143`. Це робить `mutation.isError === false` для бізнес-помилок — несподівано для будь-кого, хто читає код. Краще: кидати `ApiError` у звичайному стилі, обробляти в `mutation.onError`.

**🟡 Sign-up використовує `as any` для дискримінації.**
`SignUpForm.tsx:178-188`. Zod уже дискримінує по `accountType`, але код не довіряє типам. Рефактор через `if (accountData.accountType === 'business')` без `as any`.

**🟡 `staleTime: 60_000` глобально + `useAuth` без override.**
`providers.tsx:19` + `useAuth.ts`. Якщо в одній вкладці юзер вилогінився, інша не побачить `null` ще до 60с. Для `['me']` краще `staleTime: 0` або `refetchOnWindowFocus: true`.

### 6.3. 🟢 Nice-to-have

- **Sign-in password schema**: `z.string().min(8)` — для входу зайвого suggest-у не треба, але можна узгодити з sign-up (там вимоги жорсткіші). На вхід — нормально.
- **A11y**: `Loading...` у PrivateRoute без `role="status"`/`aria-live`.
- **`useEffect` deps disable**: `SignInForm.tsx:60` — `// eslint-disable-next-line react-hooks/exhaustive-deps`. Винести логіку в окрему функцію або додати залежності — eslint-ігнори завжди є red flag.
- **`getEmail` має URL `/api/check-email`, а baseURL — `/api`** → реально летить на `/api/api/check-email`. Це не auth, але показове — `api.ts:48,57` мають баг із подвійним префіксом.
- **Facebook-кнопка без `onClick`** — або зробити, або сховати.

---

## 7. Що покращити (з прикладами)

### 7.1. 🔴 Виправити open-redirect

**Файл**: `src/components/auth/SignInForm.tsx` (та `SignUpForm.tsx`).

```tsx
function isSafeCallback(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url === '/sign-in') return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;       // protocol-relative
  if (url.startsWith('/\\')) return false;      // Windows-path трюк
  return true;
}
// далі
router.push(isSafeCallback(callbackUrl) ? callbackUrl : '/welcome');
```

### 7.2. 🔴 Прибрати `useAuthRedirect` із `auth.ts`

**Файл**: `src/lib/auth/auth.ts:84` + `src/hooks/useRouter.ts`.

```ts
// auth.ts
function clearSessionLocally(): void {
  clearRefreshTimer();
  clearPersistedExpiry();
  if (typeof window !== 'undefined') {
    const path = window.location.pathname + window.location.search;
    const callbackUrl = path && path !== '/sign-in'
      ? `?callbackUrl=${encodeURIComponent(path)}`
      : '';
    window.location.replace(`/sign-in${callbackUrl}`);
  }
}
```

`useAuthRedirect` — або видалити, або залишити суто для компонент-юзкейсів. Хук не може жити поза рендером.

### 7.3. 🔴 Активувати таймер після `/auth/login` теж

**Файл**: `src/lib/auth/auth.ts:192`.

```ts
if (
  (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh'))
  && typeof expiresIn === 'number'
) {
  setTokenExpiresAt(expiresIn);
  scheduleRefreshTimer(expiresIn);
  authChannel?.postMessage({ type: 'login', expiresIn });
}
```

Тоді можна прибрати ручний `initAuthSession(...)` з `SignInForm` (буде менше дубляжу) і авто-логін після sign-up «оживе» автоматично.

### 7.4. 🔴 Logout: трансляція по вкладках

**Файл**: новий експорт у `src/lib/auth/auth.ts`.

```ts
export function notifyLogoutAcrossTabs(): void {
  authChannel?.postMessage({ type: 'logout' });
  clearRefreshTimer();
  clearPersistedExpiry();
}
```

У `WelcomeClientContent.tsx:onSuccess`:

```tsx
onSuccess: () => {
  notifyLogoutAcrossTabs();
  queryClient.removeQueries({ queryKey: ['me'] });
  window.location.replace('/sign-in');
}
```

### 7.5. 🟡 `useAuth` для критичного user-state

**Файл**: `src/hooks/useAuth.ts`.

```ts
export function useAuth() {
  return useQuery({
    queryKey: ['me'],
    queryFn: authMe,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
```

### 7.6. 🟡 `PrivateRoute` без full reload + з callbackUrl

```tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

useEffect(() => {
  if (!isLoading && (isError || !user)) {
    const cb = encodeURIComponent(`${pathname}?${searchParams?.toString() ?? ''}`);
    router.replace(`/sign-in?callbackUrl=${cb}`);
  }
}, [isLoading, isError, user, pathname, searchParams, router]);
```

### 7.7. 🟡 `signUpAction` у дзеркалі до `signInAction`

Перенести `registerMultipart` у server action; на сервері читати backend response, парсити Set-Cookie, ставити через `cookies().set()`. Мінімум — однорідна архітектура; максимум — RSC бачать користувача одразу.

### 7.8. 🟡 Видалити «Remember me» або реалізувати

Якщо реалізувати — додати у `signInAction` body `{ rememberMe: true }`, бекенд має видавати довший refresh-token із `Max-Age` побільше.

---

## 8. Як розповідати на інтерв’ю

### 8.1. 30-секундна версія

> «У нас Next.js 15 App Router. Sign-in — через Server Action: парсимо `Set-Cookie` з бекенду на сервері і прокидаємо в `cookies()`. Кукі — HttpOnly. На клієнті — axios з interceptor-ом, який на 401 робить silent refresh і ретраїть запит. Refresh-таймер взводиться проактивно за хвилину до експірації. Між вкладками синкаємось через BroadcastChannel. Захист сторінок — двошаровий: edge middleware по куці плюс клієнтський `<PrivateRoute>` на `useQuery('/auth/me')`. OAuth Google — через server-side redirect.»

### 8.2. 2-хвилинна Middle-версія

> «Auth у нас побудований з кількох частин.
> 1. **Server Action для логіну.** Форма надсилає FormData у `signInAction` через `useActionState`. Дія валідує даними zod, fetch-ить бекенд з `AbortController` (10с таймаут), парсить кожен `Set-Cookie` хедер і кладе у `cookies()` — браузер отримує кукі вже у відповіді Next.
> 2. **HttpOnly access + refresh кукі.** Жодного `localStorage` для самих токенів. Ми зберігаємо лише момент експірації — щоб після reload відновити таймер refresh. SameSite=strict + secure на проді закриває CSRF.
> 3. **Refresh.** У `auth.ts` я тримаю axios-інстанс з response-інтерсептором. Якщо ми отримуємо 401 від не-auth ендпойнта і це не повторна спроба — я ставлю запит у `failedQueue`, паралельно роблю один `POST /auth/refresh` (з обробкою 409 `REFRESH_CONCURRENT` і `Retry-After`) і потім ретраю усі чекаючі запити. Плюс таймер за 60 секунд до експірації і `visibilitychange` listener — якщо вкладка повернулась і часу лишилось ≤ 30с, refresh-аю одразу.
> 4. **BroadcastChannel.** Усі вкладки одного origin діляться подіями `login`/`logout`/`refreshed` — щоб таймер ніде не дублювався і вилогінювання було глобальним.
> 5. **Захист сторінок.** Edge middleware по `access_token` cookie на `/welcome/*` плюс `<PrivateRoute>` на клієнті — він ходить на `/auth/me` через TanStack Query і редіректить, якщо нема юзера.
> 6. **OAuth.** Google — `window.location.href = baseUrl + '/auth/google?redirectPath=...'`, бекенд тримає state, кінчається тим самим cookie-flow.»

### 8.3. Ймовірні follow-up питання + сильні відповіді

**Q: Чому ви не зберігаєте accessToken у localStorage?**
A: Бо XSS зчитає його миттєво. HttpOnly-кукі недоступні JS, а SameSite=strict закриває CSRF — це поточно безпечне поєднання для класичного web.

**Q: Як ви боретесь з паралельними 401?**
A: У interceptor-і є прапорець `isRefreshing` і `failedQueue`. Перший 401 ставить прапорець і запускає refresh; усі наступні 401 кладуть свої `resolve/reject` у чергу. По завершенні refresh — `processQueue` розблоковує всіх, ми ретраїмо оригінальні запити. Якщо refresh упав — ріжемо сесію.

**Q: А що, якщо два вкладки одночасно роблять refresh?**
A: Бекенд має token rotation — другий refresh з тим самим токеном поверне 409 `REFRESH_CONCURRENT` з `Retry-After`. Ми спимо рекомендований інтервал і ретраїмо ОДИН раз. Якщо знову 409 — вважаємо сесію мертвою.

**Q: Як уникаєте race-condition між таймером і інтерсептором?**
A: `clearRefreshTimer()` дзвонимо перед кожним запуском нового таймера. Refresh у інтерсепторі під прапорцем `isRefreshing` — паралельний таймер просто не побачить ту 401 (це той самий axios-інстанс).

**Q: Як ви обробляєте «зайшов з іншої вкладки»?**
A: BroadcastChannel `'auth'`. Будь-який `login`/`refreshed` івент перепідіймає таймер у всіх вкладках. `logout` чистить локально + редіректить на /sign-in.

**Q: SSR-сумісність?**
A: `auth.ts` має guards `typeof window !== 'undefined'`, `typeof document !== 'undefined'`. BroadcastChannel створюється тільки в браузері. Server Action для логіну — повністю SSR-friendly: працює з `cookies()` напряму.

**Q: Як редагуєте expiration після reload?**
A: Зберігаємо абсолютний `expiresAt` у `localStorage('auth_exp')`. На imports-init перевіряємо: якщо лишилось часу > 0 — піднімаємо таймер на залишок; інакше чистимо.

**Q: Що з «Remember me»?**
A: *(Чесна відповідь)* — у поточній версії це декорація, чекбокс не передається в action. У наступному ітерації планую розширити `signInAction` параметром і подовжити `Max-Age` refresh-кукі на бекенді.

**Q: Ваш найбільший technical-debt у auth?**
A: Sign-in робиться через Server Action, а sign-up — через client-side mutation. Це працює, але неконсистентно. Я б переніс sign-up у `signUpAction` дзеркально, що спростило б flow і дало RSC миттєвий доступ до user-context.

---

## 9. Фінальний score

| Критерій | Оцінка |
|----------|--------|
| Code quality | **7 / 10** — чітка архітектура, гарний interceptor-pattern, але є `as any`, `useAuthRedirect`-баг, неконсистентність sign-in vs sign-up |
| Security readiness | **6 / 10** — HttpOnly+SameSite добре, **але open-redirect через `callbackUrl` — реальний blocker**. Без нього було б 8. |
| Production readiness | **6 / 10** — пара bug-ів (taймер після login, broadcast logout, hooks-rule violation) не дають це сприймати як «готово до зливу» |
| Interview strength | **8 / 10** — є про що говорити: server actions + refresh-pattern + BroadcastChannel + middleware. Це сильніше середнього Middle-кандидата. |

### 9.1. Вердикт

- **Production-ready?** — Ні, але близько. Потрібно полагодити три червоних: open-redirect, `useAuthRedirect` rules-of-hooks, refresh-timer після login. Це 1-2 години роботи, не тиждень.
- **Чи годиться згадувати на Middle Frontend?** — Безумовно ТАК. Тут є server actions, axios refresh з чергою, BroadcastChannel, edge middleware, HttpOnly-cookies, OAuth — повний набір тем для сильної Middle-розмови. Більшість Middle-кандидатів навіть третини цього не показують.
- **З чого починати?** — у такому порядку:
  1. 🔴 Закрити open-redirect (5 хв).
  2. 🔴 Прибрати хук-виклик з `clearSessionLocally`, поставити `window.location.replace` (10 хв).
  3. 🔴 Додати `/auth/login` у success-інтерсептор + видалити ручний `initAuthSession` зі SignInForm (30 хв).
  4. 🔴 Транслювати `logout` у BroadcastChannel (10 хв).
  5. 🟡 Винести sign-up у server action (2 год).
  6. 🟡 Розширити middleware-matcher на всі privacy-чутливі сегменти.
  7. 🟡 Викинути або реалізувати «Remember me» + полагодити подвійний `/api/api` префікс у `getEmail`/`getInn`.

Після цих кроків це буде впевнений 8-8.5 / 10 production auth для SPA-стилю Next.js додатку.