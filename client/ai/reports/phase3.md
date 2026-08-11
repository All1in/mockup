# PHASE 1 — Evidence-based baseline для побудови CI/CD

> Дата: 2026-08-11 · Гілка: `MP-004` · HEAD: `ea02c3f`
> Вхід: `ai/prompts/phase-3-ci.md`
> Попередні звіти: `ai/reports/ci-pipeline-answer.md` (ЕТАП 1–2), `ai/reports/to-do-in-ci.md` (ЕТАП 3)
>
> **Статус:** PHASE 1 завершено. Жодного файлу CI не створено, application code не змінено,
> lint не виправлено, Playwright не змінено, scripts не додано, commit не зроблено.

---

## Як читати цей документ

Він поділений на три частини, і межа між ними — жорстка:

| Частина | Що це | Правило |
|---|---|---|
| **I. EVIDENCE** | Що є правдою **зараз**. Кожен рядок — результат виконаної команди | Тут немає жодної пропозиції. Тільки виміряне |
| **II. ASSESSMENT** | Інтерпретація evidence: що блокує, що борг, що прогалина | Висновки, але без рішень |
| **III. PROPOSAL** | Що ми **пропонуємо побудувати** | Тут немає жодного твердження про поточний стан |

Якщо в частині I ви бачите слово «треба» — це помилка, повідомте.
Якщо в частині III ви бачите цифру без посилання на частину I — це теж помилка.

**Позначення:** ✅ підтверджено виміром · ⚠️ підтверджено, але з поправкою ·
❌ спростовано виміром · [оцінка] — моя оцінка, не вимір.

---
---

# ЧАСТИНА I — EVIDENCE (what is true now)

## 1. Committed HEAD vs Working Tree

**Це найважливіша знахідка звіту.** Стан, описаний у `phase-3-ci.md`, — це стан **робочого
дерева**. CI працює від **закоміченого стану**. Це різні речі, і зараз вони розходяться.

### 1.1 Що саме розходиться

```
$ git status --porcelain
 M client/tests/fixtures/auth.fixture.ts
?? client/ai/prompts/phase-3-ci.md
```

Незакомічений diff (`git diff client/tests/fixtures/auth.fixture.ts`):

```diff
-import { test as base, type Route } from '@playwright/test';
+import { test as base, type Page, type Route } from '@playwright/test';
@@
-  mockLogin: (handler: (route: Route) => Promise<void> | void) => Promise<void>;
+  mockLogin: (handler: (route: Route) => Promise<void> | void) => ReturnType<Page['route']>;
```

Це — **єдина** зміна в робочому дереві. І саме вона робить TypeScript зеленим.

### 1.2 Доказ: перевірка на ізольованому committed HEAD

Щоб не покладатися на міркування, я створив окремий git worktree з `HEAD` (без робочого
дерева) і прогнав там TypeScript:

```
$ git worktree add --detach <tmp> HEAD
$ cd <tmp>/client && npx tsc --noEmit

tests/fixtures/auth.fixture.ts(54,15): error TS2345:
  Argument of type '(handler: (route: Route) => Promise<void> | void) => Promise<Disposable>'
  is not assignable to parameter of type '(handler: ...) => Promise<void>'.
    Type 'Promise<Disposable>' is not assignable to type 'Promise<void>'.
      Type 'Disposable' is not assignable to type 'void'.
```

Worktree після перевірки видалений (`git worktree remove --force` + `prune`).

### 1.3 Два різні baseline

| Перевірка | **Repository baseline** (committed `HEAD` = `ea02c3f`) | **Working-tree baseline** (те, що бачиш ти) |
|---|---|---|
| `tsc --noEmit` (client) | ❌ **1 error** — `auth.fixture.ts:54` TS2345 | ✅ **0 errors** (exit 0) |
| `next build` (client) | ❌ **впаде** — `next build` виконує ту саму перевірку типів (`✓ Finished TypeScript`), а `client/tsconfig.json` включає `tests/` у компіляцію | ✅ проходить |
| `tsc --noEmit` (server) | ✅ 0 errors | ✅ 0 errors |
| `playwright test --list` | ✅ `Total: 51 tests in 2 files` | ✅ `Total: 51 tests in 2 files` |
| `eslint .` | 52 errors / 15 warnings | 52 errors / 15 warnings |

**Уточнення щодо `next build` на HEAD.** Пряма перевірка білду в ізольованому worktree
не дала чистого результату з технічної причини: я підключив `node_modules` симлінком, а
Turbopack відмовляється працювати з симлінком, що виходить за межі кореня ФС
(`Symlink node_modules is invalid, it points out of the filesystem root`). Тому висновок
про падіння білду на HEAD зроблено **не** прямим запуском, а з двох підтверджених фактів:
(1) `tsc --noEmit` на HEAD падає саме на цьому файлі; (2) ЕТАП 1 зафіксував падіння
`npm run build` **на тому самому файлі й тому самому рядку** (`auth.fixture.ts:54`).
Позначаю це як ⚠️ — висновок надійний, але отриманий не одним запуском.

### 1.4 Практичний наслідок

`phase-3-ci.md` стверджує:

> `npm run build` успішний: ✓ Compiled successfully ✓ Finished TypeScript

⚠️ **Це правда для робочого дерева і неправда для репозиторію.** GitHub Actions робить
`actions/checkout`, який відтворює **закомічений** стан. Тобто перший же build-job на
поточному `HEAD` буде червоним — не через CI, а тому що фікс ніколи не був закомічений.

---

## 2. Playwright

### 2.1 Collection — підтверджено

```
$ npx playwright test --list
Total: 51 tests in 2 files
```

✅ Цифра з промпту точна. Розклад: 17 унікальних тестів × 3 браузери (chromium, firefox,
webkit) = 51.

Файли: `tests/auth/sign-in.spec.ts` (15 тестів), `tests/example.spec.ts` (2 тести).

⚠️ **Поправка до формулювання «17 × 3».** У `playwright.config.ts` оголошено **чотири**
проєкти, а не три. Четвертий — `authenticated` з `testMatch: '**/protected/**/*.spec.ts'`.
Директорії `tests/protected/` не існує, тому проєкт збирає **0 тестів** і в підсумок не
входить. Тобто 51 = 17 × 3, а четвертий проєкт присутній у конфізі, але порожній.
Додатково: `globalSetup` у конфізі **закоментований** (`playwright.config.ts:5`), а саме
він генерує `storageState`, від якого залежить проєкт `authenticated`.

### 2.2 Фактичний запуск — тут цифри розходяться з промптом

```
$ npx playwright test --project=chromium --reporter=list
...
7 failed
10 passed (36.5s)
```

❌ **`phase-3-ci.md` не містить жодної інформації про те, що тести падають.** Промпт
подає `--list` як доказ здоров'я набору («`npx playwright test --list` успішний») і
переходить до PHASE 4 з припущенням, що тести треба просто запустити в CI.

**Сім тестів, що падають (усі — `tests/auth/sign-in.spec.ts`):**

| Рядок | Тест |
|---|---|
| `:36` | Sign In @smoke › успішний логін → redirect на `/welcome` |
| `:43` | Sign In @smoke › сесія зберігається після page reload |
| `:78` | callbackUrl › валідний внутрішній шлях → redirect туди після логіну |
| `:85` | callbackUrl › open redirect guard: зовнішній URL → fallback на `/welcome` |
| `:113` | Sad path @regression › невалідні credentials → показує помилку |
| `:124` | Sad path @regression › кнопка disabled і показує "Signing in..." |
| `:146` | Sad path @regression › 500 від сервера → показує повідомлення |

Приклад фактичної помилки (тест `:113`):

```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Invalid email or password')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

**Десять, що проходять** — це client-side валідація (порожній email, формат email,
довжина пароля, сабміт порожньої форми), route protection і `example.spec.ts`.
Спільна риса: **жоден із них не перетинає межу «браузер → сервер»**.

### 2.3 Root cause — архітектурна невідповідність, а не flaky

Це не нестабільність і не таймаути. Ланцюг причин відтворений по коду:

**Крок 1. Форма більше не робить HTTP-запит із браузера.**

`src/components/auth/SignInForm.tsx:3,21,35`

```ts
import { useEffect, useActionState, startTransition } from 'react';
import { signInAction, SignInActionState } from '@/app/actions/auth.actions';
...
const [actionState, dispatch, isPending] = useActionState(signInAction, initialState);
```

**Крок 2. `signInAction` — це Server Action, він виконується на сервері Next.js.**

`src/app/actions/auth.actions.ts:1,39,61`

```ts
'use server';
...
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';
...
res = await fetch(`${BACKEND_URL}/auth/login`, { method: 'POST', ... });
```

**Крок 3. Мок перехоплює трафік браузера, а не сервера.**

`tests/fixtures/auth.fixture.ts:51`

```ts
mockLogin: async ({ page }, use) => {
  const mock = (handler) => page.route('**/auth/login', handler);
```

`page.route()` — це перехоплення на рівні **контексту браузера**. Він бачить лише ті
запити, які ініціює сторінка.

**Крок 4. Що відбувається насправді.**

```
Браузер ──POST (Server Action, на поточний URL)──▶ Next.js server
                                                        │
                                                        │ fetch(BACKEND_URL/auth/login)
                                                        ▼
                                                  localhost:4000  ← не запущений у тесті

page.route('**/auth/login')  ──▶  ніколи не спрацьовує:
                                  браузер цього URL не запитує
```

Мок не встановлюється помилково — він встановлюється правильно й **просто ніколи не
викликається**. Далі Server Action не може достукатися до бекенда, повертає
`{ code: 'NETWORK_ERROR', message: 'Unable to reach server.' }`, і на екрані з'являється
не той текст, якого чекає тест.

**Крок 5. Чому ці тести колись були правильними.**

`client/next.config.ts` містить rewrite:

```ts
{ source: '/auth/:path*', destination: `${backendUrl}/auth/:path*` }
```

За старої архітектури форма робила `fetch('/auth/login')` **з браузера**, Next
проксіював його на бекенд, і `page.route('**/auth/login')` перехоплював його ідеально.
Застосунок перейшов на Server Actions; тести лишилися на старій моделі. Rewrite у
`next.config.ts` досі є — він обслуговує інші виклики, — але для логіну шлях уже інший.

### 2.4 `--list` ≠ passing tests

Це продовження теми vacuous success із попереднього етапу, на один рівень вище.

| Команда | На яке питання відповідає | На яке **не** відповідає |
|---|---|---|
| `playwright test --list` | Чи парситься файл і чи зібрався набір | Чи тест взагалі виконується |
| `playwright test` (exit 0) | Чи всі зібрані тести пройшли | Чи набір повний, чи він щось справді перевіряє |

Раніше ми ловили випадок «0 зібрано → зелений exit». Тепер маємо симетричний:
**51 зібрано → 7 падають**, а звіт про стан проєкту побудований на `--list`. Обидва
випадки — це підміна питання «що виконалося» питанням «що не впало на етапі підготовки».

---

## 3. ESLint

### 3.1 Загальні цифри — підтверджено

```
$ npm run lint
✖ 67 problems (52 errors, 15 warnings)
```

✅ Точно збігається з промптом. Прогнав додатково `eslint . -f json` для розкладки:
**проліntовано 104 файли, проблеми у 27 файлах.**

### 3.2 Розкладка по правилах (з розділенням за severity)

| Правило | Errors | Warnings | Разом |
|---|---:|---:|---:|
| `@typescript-eslint/no-explicit-any` | **33** | 0 | 33 |
| `react-hooks/refs` | 6 | 0 | 6 |
| `react-hooks/exhaustive-deps` | 0 | 5 | 5 |
| *(unused eslint-disable directive)* | 0 | 5 | 5 |
| `react-hooks/set-state-in-effect` | 3 | 0 | 3 |
| `react-hooks/incompatible-library` | 0 | 2 | 2 |
| `react-hooks/preserve-manual-memoization` | 2 | 0 | 2 |
| `@typescript-eslint/no-unused-vars` | 0 | 2 | 2 |
| `@typescript-eslint/ban-ts-comment` | 2 | 0 | 2 |
| `react-hooks/rules-of-hooks` | **2** | 0 | 2 |
| `@next/next/no-img-element` | 0 | 1 | 1 |
| `react/no-unescaped-entities` | 1 | 0 | 1 |
| `react-hooks/purity` | 1 | 0 | 1 |
| `react/display-name` | 1 | 0 | 1 |
| `@typescript-eslint/no-empty-object-type` | 1 | 0 | 1 |
| **ВСЬОГО** | **52** | **15** | **67** |

⚠️ Промпт перелічує `react-hooks/exhaustive-deps` серед «основних категорій errors» —
фактично це **5 warnings**, не errors. Дрібниця, але для baseline важлива: warnings і
errors мають різну політику блокування.

⚠️ П'ять проблем — це не порушення коду, а **`Unused eslint-disable directive`**:
у `src/shared/customizations/{dataDisplay,feedback,inputs,navigation,surfaces}.*` стоять
`// eslint-disable ... import/prefer-default-export` для правила, якого в конфізі більше
немає. Це не борг у коді — це застарілі коментарі.

### 3.3 Концентрація: 33 з 52 errors — одне правило, і воно локалізоване

`@typescript-eslint/no-explicit-any` — **63% усіх errors**. Розподіл по файлах:

| Файл | `any` |
|---|---:|
| `src/app/(auth)/sign-up/steps/AccountTypeStep.tsx` | 16 |
| `src/components/auth/SignUpForm.tsx` | 7 |
| `src/app/(auth)/sign-up/steps/ConfirmationStep.tsx` | 4 |
| `src/types/formTypes.ts` | 2 |
| `src/app/(auth)/sign-up/steps/PersonalDataStep.tsx` | 1 |
| `src/features/blog/ui/BlogPostContent.tsx` | 1 |
| `src/utils/Error.ts` | 1 |
| `src/utils/signUpStepSchemas.ts` | 1 |

**28 із 33 (85%) — це один кластер: multi-step форма реєстрації** (`AccountTypeStep` +
`SignUpForm` + `ConfirmationStep` + `PersonalDataStep` + `formTypes`). Це не розсипаний
по кодовій базі борг, а одна незакінчена типізація в одному місці.

### 3.4 Два errors, які є misapplied rule, а не борг

`tests/fixtures/auth.fixture.ts:48` і `:54` — `react-hooks/rules-of-hooks`:

```
React Hook "use" is called in function "signInPage" that is neither a React
function component nor a custom React Hook function.
```

Це **Playwright fixture API**, а не React:

```ts
signInPage: async ({ page }, use) => {   // ← `use` тут — параметр Playwright
  await use(signInPage);
}
```

Правило `react-hooks/rules-of-hooks` бачить виклик функції з іменем `use` і вважає його
React-хуком. Це false positive: правило застосоване до файлів, для яких воно не
призначене — бо в `client/eslint.config.mjs` React-конфіги (`nextVitals`, `nextTs`)
поширюються на **всі** файли, включно з `tests/**`.

**Важливо для стратегії.** Правильне усунення тут — **не** `eslint-disable` і **не**
вимкнення правила глобально, а **scoped override**: обмежити React-специфічні правила
директорією `src/**` або вимкнути їх для `tests/**`. Це виправлення **області
застосування** конфігурації, а не приховування помилки. Після нього чесний baseline
стане **50 errors**, і всі 50 будуть справжніми.

### 3.5 Ризик: baseline 52 нестабільний через артефакти тестів

`client/eslint.config.mjs` ігнорує лише:

```js
globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
```

`playwright-report/`, `test-results/`, `coverage/`, `blob-report/` — **не ігноруються
ESLint** (вони є в `.gitignore`, але це різні механізми).

Зараз на диску обидві директорії існують (`playwright-report/` — 520 KB,
`test-results/` — 24 MB), і `find` не знаходить у них **жодного** `.js`/`.mjs` файлу:
поточний HTML-репорт — один самодостатній `index.html`, а ESLint `.html` не лінтить.
Саме тому зараз 67, а не 3081, як було зафіксовано в ЕТАПІ 1.

**Тобто цифра 52 залежить від того, у якій формі згенеровано звіт Playwright.** У ЕТАПІ 1
цих проблем було 3081 (2994 з них — із `playwright-report/`). Механізм, який тоді
роздував цифру, **досі не усунений** — просто зараз артефакт має іншу форму.

**Наслідок для CI:** на чистому `actions/checkout` цих директорій не існує, тому окремий
lint-job побачить чесні 52. Але якщо lint і e2e виконуються **в одному workspace** і lint
іде **після** e2e — число може стрибнути на порядок, і baseline розсиплеться.

---

## 4. Security

```
$ gitleaks git --log-opts="--all" .
27 commits scanned · ~1.53 MB · no leaks found
```

✅ Підтверджено. `gitleaks` встановлений локально: `/opt/homebrew/bin/gitleaks`,
версія **8.30.1**.

⚠️ Уточнення про «27 commits»: `git rev-list --count HEAD` на `MP-004` дає **20**.
27 — це сума по **всіх** гілках (`--log-opts="--all"`), що для сканування історії
правильно. Обидві цифри вірні, просто це різні області.

Додатково перевірено:

| Перевірка | Результат |
|---|---|
| `.env` у git | ✅ Не відстежується. `git ls-files \| grep env` → тільки `server/.env.example` і `server/src/config/env.ts` |
| `server/.env.example` | ✅ Тільки плейсхолдери (`sk_test_...`, `whsec_...`, `change-me-...`) |
| `client/.gitignore` | ✅ Містить `.env*`, `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.auth/`, `/tests/.auth/` |
| root `.gitignore` | ✅ Містить `.env`, `.env.local`, `.env.*.local`, `node_modules/`, `dist/`, `coverage/` |
| Секрети для E2E | ✅ Не потрібні: `tests/setup/global.setup.ts` бере `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` з env із fallback на seed-юзера, і сам `globalSetup` вимкнений |

---

## 5. Build / TypeScript

| Перевірка | Команда | Repository (HEAD) | Working tree |
|---|---|---|---|
| Client TS | `npx tsc --noEmit` (client) | ❌ 1 error (`auth.fixture.ts:54`) | ✅ exit 0 |
| Client build | `npm run build` (client) | ⚠️ впаде — див. §1.3 | ✅ проходить |
| Server TS | `npx tsc --noEmit` (server) | ✅ exit 0 | ✅ exit 0 |
| Server build | `npm run build` (server) | ✅ `tsc` чисто | ✅ чисто |

**Структурна причина, чому TS-помилка в тесті ламає білд застосунку.**
`client/tsconfig.json`:

```json
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
"exclude": ["node_modules"]
```

`tests/` підпадає під `**/*.ts` і не виключений. Тому `next build` тайпчекає тестову
інфраструктуру разом із застосунком, і помилка у Playwright-фікстурі блокує production
build. Окремого `tsconfig` для тестів немає.

**Warning на білді** (не блокує):

```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

✅ Підтверджено: `client/src/middleware.ts` існує, `client/src/proxy.ts` — ні.

---

## 6. Repository infrastructure

### 6.1 Що є

| Компонент | Стан |
|---|---|
| Package manager | ✅ npm. Два lockfile: `client/package-lock.json`, `server/package-lock.json` — обидва в git |
| Структура | Псевдо-монорепо: `client/` + `server/` — два незалежні npm-проєкти. npm workspaces **не** використовуються. Root `package.json` лише проксіює на `server/` |
| Node/npm локально | v22.4.1 / 10.8.3 |
| ESLint | ✅ `client/eslint.config.mjs` (flat config, ESLint 9) |
| TypeScript | ✅ `client/tsconfig.json` (`strict: true`), `server/tsconfig.json` |
| Playwright | ✅ `client/playwright.config.ts` — у git, 4 проєкти, `webServer`, `forbidOnly: !!process.env.CI` |
| Gitleaks | ✅ Встановлений локально (8.30.1), історія чиста |
| `.gitignore` | ✅ Обидва рівні коректні |

### 6.2 Чого немає (infrastructure gaps)

| # | Відсутнє | Підтвердження | Наслідок для CI |
|---|---|---|---|
| 1 | `.github/` | `ls .github` → No such file or directory | CI не існує. Немає workflows, CODEOWNERS, PR-шаблонів, dependabot config |
| 2 | `.nvmrc` / `engines` / `packageManager` | немає в жодному з трьох `package.json` | CI-runner візьме довільну Node. Відтворюваність не гарантована |
| 3 | `typecheck` script | `client`: `dev/build/start/lint`. `server`: `build/start/dev` | Немає окремого швидкого гейта типів. Типи перевіряються лише як побічний ефект білду |
| 4 | `test` / `e2e` scripts | немає в жодному проєкті | CI мусив би містити сиру `npx playwright test` — логіка перетекла б у YAML |
| 5 | `format` / `format:check` | `prettier@^3.8.1` у devDeps, конфіг є, скрипта немає | Форматування не перевіряється ніде |
| 6 | Lint/Prettier/тести на сервері | `server/package.json` має тільки `build/start/dev`, ESLint не встановлений | **Половина монорепо поза будь-якими гейтами якості** |
| 7 | Deployment config | `vercel.json`, `Dockerfile`, `docker-compose*`, `fly.toml`, `.vercel/` — жодного | Немає deployment target. Preview-енвів не існує |
| 8 | Unit/component тести | ні Vitest, ні Jest, ні Testing Library, ні coverage | Піраміда тестів складається лише з E2E |
| 9 | Окремий `tsconfig` для `tests/` | див. §5 | Тестовий код блокує production build |
| 10 | Git hooks | ні husky, ні lint-staged | Нічого не перевіряється до пушу |

### 6.3 Стан гілок

```
origin/main   origin/MP-004   origin/auth-feature   origin/feature/auth
origin/live-coding-auth-starter   origin/momot-main   origin/seva/main
```

7 віддалених гілок на команду 2–3 людини. ✅ Промпт правильно визначає активними
`origin/main` і `origin/MP-004`.

### 6.4 Стан історії комітів

Останні коміти на `MP-004`:

```
ea02c3f  ai files
96190c8  smth fucking useless
91db8b6  smth fucking useless
1fbc981  feat: implemented zod validation
```

⚠️ Рекомендація з `to-do-in-ci.md` §0.1 (розкласти зміни на 8 логічних комітів) **не була
виконана** — усе увійшло двома комітами з неінформативними повідомленнями. Це вже
сталося й переписуванню не підлягає (гілка пушнута). Практичний наслідок: `git bisect`
по цьому діапазону не звузиться далі за «десь у цих двох комітах», і відкотити окремо
платежі, не зачепивши тестову інфраструктуру, вже не можна.

### 6.5 Env-змінні, що реально використовуються

| Змінна | Де | Дефолт |
|---|---|---|
| `BACKEND_URL` | `client/next.config.ts:3`, `client/src/app/actions/auth.actions.ts:39` | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | client | — |
| `NODE_ENV` | client + server | — |
| `PLAYWRIGHT_BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | `tests/setup/global.setup.ts` | `localhost:3001`, seed-юзер |
| `CI` | `playwright.config.ts` (`forbidOnly`, `retries`, `workers`, `reuseExistingServer`) | — |
| Server (13 шт.) | `server/.env.example`: `PORT`, `MONGO_URI`, `JWT_*`, `FRONTEND_URL`, `API_BASE_URL`, `OAUTH_STATE_SECRET`, `GOOGLE_*`, `FACEBOOK_*`, `STRIPE_*` | — |

### 6.6 Поточна Playwright-конфігурація (факти, що впливають на CI)

| Параметр | Значення | Факт |
|---|---|---|
| `webServer.command` | `npm run dev` | CI запускав би **dev-сервер**, а не production build |
| `webServer` (бекенд) | відсутній | Піднімається лише Next. Express не запускається |
| `trace` | `'on'` | Trace пишеться для **кожного** тесту. `test-results/` вже 24 MB локально |
| `video` | `'retain-on-failure'` | ОК |
| `screenshot` | `'only-on-failure'` | ОК |
| `retries` | `process.env.CI ? 2 : 0` | Ретраї ховатимуть flaky |
| `workers` | `process.env.CI ? 1 : undefined` | Один воркер у CI |
| `reporter` | `[['html'], ['list']]` | Немає `github`-репортера й немає `blob` (потрібен для merge шардів) |
| `forbidOnly` | `!!process.env.CI` | ✅ Правильно |
| `baseURL` | `http://localhost:3001` | Хардкод, не читає `PLAYWRIGHT_BASE_URL` |

---
---

# ЧАСТИНА II — ASSESSMENT

## 7. CI readiness

### 7.1 Що вже готово (можна спиратися без змін)

| Готове | Чому це важливо |
|---|---|
| Обидва lockfile у git | `npm ci` спрацює детерміновано з першого разу |
| `server` тайпчекається чисто | Один гейт зелений з дня 1 |
| Історія без секретів + коректні `.gitignore` | Security-job буде зеленим, а не «розберемось потім» |
| `forbidOnly: !!process.env.CI` | Захист від забутого `test.only` уже стоїть |
| Playwright-конфіг у git | Є з чого стартувати |
| ESLint flat config робочий | 104 файли лінтяться, дає структуровані дані |
| E2E не потребує секретів | `globalSetup` вимкнений, решта тестів працює на моках |
| Lint-борг локалізований | 85% `any` — в одному кластері форми реєстрації |

### 7.2 Що реально blocking

| # | Блокер | Чому блокує | Найменший чесний фікс |
|---|---|---|---|
| **B1** | **Committed HEAD не тайпчекається** | Перший build-job червоний. Гейти неможливо ввімкнути на червоній базі | Закомітити наявний фікс `auth.fixture.ts`. Робота — один коміт |
| **B2** | **7 із 17 E2E падають** | Якщо «Playwright failure = blocking», `main` буде перманентно червоним. Якщо не blocking — E2E-job декоративний | Розв'язок архітектурний, див. §7.5 |
| **B3** | **Node-версія не зафіксована** | CI не відтворюваний. «У мене працює» стає нефальсифікованим | `.nvmrc` + `engines`. ~15 хв |
| **B4** | **Немає npm scripts для CI** | Логіка перетече в YAML → CI неможливо відтворити локально | Додати `typecheck`, `test:e2e` тощо |

**B1 і B2 — справжні блокери. B3 і B4 — механічні.**

### 7.3 Що є technical debt (треба відстежувати, не блокувати одразу)

| Борг | Обсяг | Політика, яку пропоную |
|---|---|---|
| `no-explicit-any` | 33 errors, 85% в одному кластері | Baseline. Новий `any` — blocking |
| `react-hooks/*` (errors) | 14 errors (`refs` 6, `set-state-in-effect` 3, `preserve-manual-memoization` 2, `rules-of-hooks` 2, `purity` 1) | Baseline, **але окремо**: це не стиль, а потенційні баги рендеру |
| `react-hooks/*` (warnings) | 7 warnings | Тільки видимість |
| `ban-ts-comment` | 2 errors | Baseline |
| `react/display-name`, `no-unescaped-entities`, `no-empty-object-type` | 3 errors | Дешеві, можна закрити одним PR |
| Unused eslint-disable | 5 warnings | Не борг коду — сміття. Видаляється тривіально |
| Мертвий `recharts` | 0 імпортів у `src/` (перевірено) | Прибрати |
| `middleware.ts` → `proxy.ts` | warning на кожному білді | Зламається на Next 17 |

### 7.4 Що є infrastructure gap

Це не борг (нічого не зламано) і не блокер — це **відсутні деталі**: `.github/`,
deployment target, unit-шар, `tsconfig` для тестів, hooks, інструменти якості на сервері,
Prettier-гейт. Повний перелік — §6.2.

Найважливіший із них: **сервер узагалі не має інструментів якості**. Половина монорепо
без ESLint і без тестів — це не «додамо потім», це асиметрія, яку CI зробить видимою
одразу.

### 7.5 Що є test architecture mismatch

Це окрема категорія, і вона найважливіша концептуально.

**Проблема не в тестах і не в застосунку — у межі між ними.**

| | Тести написані під | Застосунок працює як |
|---|---|---|
| Де відбувається запит | Браузер → `/auth/login` (через rewrite у `next.config.ts`) | Браузер → Server Action → Next server → `fetch(BACKEND_URL/auth/login)` |
| Де стоїть мок | `page.route()` — контекст браузера | Мок тут не проходить: запит іде з Node-процесу |
| Точка підміни | URL-патерн | `BACKEND_URL` (env) |

Правильна точка підміни змістилася з **URL** на **env-змінну**. Це не «тести застаріли» —
це наслідок переходу на Server Actions, при якому мережевий кордон перемістився з
браузера на сервер.

**Три можливі стратегії** (детально — §11):

| | Що робимо | Плюс | Мінус |
|---|---|---|---|
| **A** | Стаб-бекенд на `BACKEND_URL` | Детермінізм 401/500/timeout без Mongo | Треба написати стаб (~100 рядків) |
| **B** | Реальний `server/` + Mongo service-container | Тестуємо справжню інтеграцію | 500-помилку не змусиш; +Mongo, +сід, повільніше |
| **C** | `test.fixme()` на 7 тестів | Миттєво, CI чесний | Борг зафіксовано, покриття логіну = 0 |

**Мій вибір: C зараз (щоб розблокувати CI), A як цільовий стан.** Причина конкретна:
всі 7 тестів перевіряють **реакцію UI на відповідь бекенда** (401, 500, network abort,
успіх). Для цього не потрібна справжня БД — потрібен передбачуваний співрозмовник.
Це рівно те, що дає стаб. Варіант B перевіряє інше питання (чи правильно ми розмовляємо
з реальним бекендом), і його місце — у повільній смузі, а не в блокуючій.

### 7.6 Категоризація lint: що має стати blocking після baseline

Промпт просив не називати lint просто «52 errors». Розкладаю за тим, **що станеться,
якщо порушення потрапить у прод**:

| Клас | Правила | К-ть | Ризик | Політика |
|---|---|---:|---|---|
| **Клас 1 — потенційні баги рендеру** | `react-hooks/refs`, `set-state-in-effect`, `purity`, `preserve-manual-memoization`, `exhaustive-deps` | 16e + 5w | 🔴 Реальні баги: зайві ре-рендери, застарілі замикання, нескінченні цикли | Baseline **із планом закриття**. Нові — blocking з дня 1 |
| **Клас 2 — ерозія типів** | `no-explicit-any`, `ban-ts-comment`, `no-empty-object-type` | 36e | 🟠 `any` знецінює `strict: true`. TS перестає ловити те, заради чого його ввімкнули | Baseline. Нові — blocking. 85% в одному кластері → закривається одним PR |
| **Клас 3 — коректність React** | `rules-of-hooks` (2), `display-name` (1) | 3e | ⚠️ **2 з 3 — false positive** на Playwright-фікстурі (§3.4) | Виправити **область конфігу**, не вимикати правило. Baseline → 50 |
| **Клас 4 — косметика / a11y** | `no-unescaped-entities`, `no-img-element` | 1e + 1w | 🟡 Низький, але `no-img-element` — це і LCP, і a11y | Blocking одразу: їх двоє |
| **Клас 5 — сміття конфігу** | unused eslint-disable | 5w | — | Прибрати, не заносити в baseline |
| **Клас 6 — не використано** | `no-unused-vars` | 2w | 🟡 | Baseline |

**Головне з цієї таблиці:** «52 errors» — це насправді **три різні проблеми** з різними
термінами: одна незакінчена типізація форми реєстрації (28), набір реальних ризиків
React-хуків (16) і два false positive від неправильної області конфігу.

---
---

# ЧАСТИНА III — PROPOSAL (what we propose to build)

> Нижче — **пропозиція**. Жоден рядок цієї частини не описує поточний стан.
> Нічого з цього ще не створено.

## 8. Corrected PHASE 2 architecture

### 8.1 Pull Request — швидка смуга

```
pull_request → [concurrency: cancel-in-progress]
│
├─ job: setup ................ npm ci (client + server), кеш по lockfile hash
│                              Node з .nvmrc
│
├─ job: static ─────────────── (паралельно з build)
│   ├─ client typecheck ...... blocking     [~15 c]
│   ├─ server typecheck ...... blocking     [~15 c]
│   └─ lint ................. baseline-gate (§9)  [~30 c]
│
├─ job: build ─────────────── (паралельно зі static)
│   ├─ client build ......... blocking     [~40 c]
│   └─ server build ......... blocking     [~20 c]
│
├─ job: e2e ──────────────── needs: build
│   └─ Chromium only ........ blocking     [~2,5–3 хв]
│       ├─ webServer: next start (production build), НЕ dev
│       ├─ стаб/квадрантин для 7 тестів (§11)
│       └─ guard: кількість зібраних тестів
│
├─ job: security ─────────── (паралельно з усім)
│   └─ Gitleaks ............. blocking     [~20 c]
│
└─ job: report ──────────── needs: [static, build, e2e, security]
    └─ PR summary table (§12)               [~5 c]
```

**Очікуваний wall clock: [оцінка] ~4 хв** (найдовший ланцюг: `setup → build → e2e`).
Вписується у твій SLA 5 хв.

### 8.2 Push to main — повна смуга

```
push: main
│
├─ ті самі static + build + security
│
├─ job: e2e-full ─────────── needs: build
│   └─ matrix: [chromium, firefox, webkit]  — 3 паралельні джоби
│       └─ blob-репортери → merge у єдиний HTML
│                                            [~4–5 хв wall clock]
│
└─ job: lint-baseline-update
    └─ якщо errors < baseline → оновити зафіксоване число (ratchet, §9)
```

### 8.3 Що я змінив відносно твоєї схеми і чому

| Твоя схема | Моя правка | Причина (з посиланням на evidence) |
|---|---|---|
| `Install → Static → Build → E2E → Security` строго послідовно | `static`, `build`, `security` — **паралельно**; `e2e` — `needs: build` | Послідовність дає ~6 хв, паралельність ~4 хв. Gitleaks не залежить від білду |
| «Unit tests (если существуют)» | **Прибрано з пайплайну** | §6.2 п.8: unit-тестів не існує. Порожній job — це шум. Повернемо, коли з'явиться Vitest |
| E2E просто «запускати Playwright» | + production build замість dev, + guard на кількість, + стратегія для 7 падаючих | §6.6 і §2.2 |
| Gitleaks у кінці | Паралельно, з початку | Найдешевший job (~20 c). Немає причини чекати на нього білд |
| — | + `job: report` | PHASE 11 промпту вимагає зведену видимість. Це і є її місце |
| — | + `concurrency` | Не згадано в промпті. Без нього два пуші в PR ганяють два повні пайплайни |

### 8.4 Чому `next start`, а не `npm run dev`

`playwright.config.ts:56` зараз піднімає `npm run dev` (§6.6). Для CI це неправильно з
трьох причин:

1. **Тестується не той артефакт.** Dev-режим — інший рендер, інший HMR-шар, немає
   production-оптимізацій. Зелений E2E проти dev не є доказом, що production працює.
2. **Повільніше й нестабільніше.** Перший запит компілює сторінку на льоту → таймаути на
   холодному старті → flaky, який виглядатиме як баг застосунку.
3. **Ламає майбутній build once/deploy many.** Якщо E2E збирає застосунок сам, ми не
   можемо перевіряти той самий артефакт, який поїде в деплой.

Пропозиція: `webServer.command` читає env — dev локально, `next start` у CI, і
`baseURL` читає `PLAYWRIGHT_BASE_URL` (зараз захардкожений).

---

## 9. Lint baseline: механізм (пояснення до реалізації)

Промпт вимагає: «Если для реализации baseline нужен конкретный механизм — сначала
объясни его и только потом реализуй». Пояснюю; **не реалізую**.

### 9.1 Три можливі механізми

**Механізм 1 — числовий поріг (ratchet).**
У репо лежить файл із числом (`52`). CI фейлить, якщо errors > числа. Коли менше —
число оновлюється.

- ➕ Нуль залежностей, тривіально, працює з будь-яким лінтером.
- ➖ **Дірка:** виправив 1 старий + додав 1 новий = 52, гейт мовчить. Регресія проходить.

**Механізм 2 — знімок по файлах/правилах.**
JSON-знімок «файл → правило → кількість». CI порівнює й фейлить на будь-якому
**новому** поєднанні.

- ➕ Ловить регресію в конкретному файлі, навіть якщо загальна сума не змінилась.
- ➖ Знімок шумить при рефакторингу (перейменували файл → «нові» порушення). Потребує
  інструмента (`betterer`) або ~50 рядків власного скрипта.

**Механізм 3 — lint тільки змінених файлів (`--filter` за `git diff`).**
На PR лінтується лише те, що зачепив PR. Правило: **новий і змінений код — чистий**.

- ➕ Найчесніше правило («не погіршуй те, чого торкнувся»), нульова підтримка стану,
  не шумить при рефакторингу.
- ➖ Не бачить файли, яких PR не торкався; сам по собі не зменшує баланс боргу.

### 9.2 Що пропоную

**Комбінацію 3 + 1**, у два джоби:

```
job: lint-changed   (blocking)      → eslint на файлах з git diff origin/main...HEAD
                                      будь-який error → червоно

job: lint-baseline  (blocking)      → eslint . ; порівняти з .ci/lint-baseline.json
                                      errors > baseline → червоно
                                      errors < baseline → зелено + підказка оновити
```

**Чому саме так:** механізм 3 закриває дірку механізму 1 (виправив-один-додав-один не
пройде, бо новий error буде у зміненому файлі), а механізм 1 гарантує, що загальний борг
не росте іншими шляхами. Механізм 2 залишаю на потім — його ціна виправдана від
[оцінка] кількох сотень порушень; при 52 з них 28 в одному кластері він надлишковий.

### 9.3 Три речі, які треба зробити ДО фіксації baseline

Інакше зафіксуємо неправильне число:

1. **Додати `playwright-report/`, `test-results/`, `blob-report/`, `coverage/` в
   `globalIgnores`** (§3.5). Інакше baseline залежить від того, чи ганяли тести.
2. **Scoped override для `tests/**`** — прибрати React-правила з Playwright-файлів
   (§3.4). Це виправлення області конфігу, а не приховування: 52 → **50**.
3. **Прибрати 5 unused eslint-disable** (§3.2) — це сміття, не борг.

Після цих трьох дій чесний baseline: **50 errors / 10 warnings**.
Жодне правило при цьому не вимикається і жоден `eslint-disable` не додається.

---

## 10. Playwright: матриця й trade-off

### 10.1 Як я трактую «не змінювати матрицю 17 × 3»

Згідно з твоїм уточненням:

- ✅ **Набір тестів незмінний** — 17 унікальних тестів, жодного не видаляємо.
- ✅ **Browser coverage повного набору незмінний** — chromium + firefox + webkit.
- ✅ **Дозволено:** різна стратегія запуску для різних тригерів.

```
PR          → chromium               = 17 тестів   [~2,5–3 хв]
push main   → chromium+firefox+webkit = 51 тест    [~4–5 хв, 3 паралельні джоби]
```

Жоден тест не зникає. Змінюється **частота** запуску кожного браузера.

### 10.2 Trade-off — чесно

**Що ми виграємо:** feedback на PR 4 хв замість [оцінка] 6–7 хв. При 2–3 людях і
кількох PR на день це десятки хвилин очікування щодня, а головне — 4 хв утримують
розробника в контексті, 7 хв ні.

**Що ми програємо — конкретно:** **браузер-специфічний баг потрапляє в `main`** і
виявляється вже після мержу. Реалістичні класи для цього застосунку:

| Клас | Ризик |
|---|---|
| WebKit і `SameSite`/HttpOnly-куки | 🔴 **Найвищий.** Уся ваша авторизація на куках, а Safari найсуворіший до cookie-політик |
| WebKit і date/regex/Intl | 🟠 Форма реєстрації має вікові перевірки й `\p{L}`-регекси |
| Firefox і CSS/layout MUI | 🟡 |
| Різниця в мережевих таймінгах | 🟡 Може проявитися як flaky |

**Чому компроміс усе одно правильний:** ціна = час від мержу до виявлення (при
trunk-based і nightly — до доби). Ціна альтернативи = +3 хв × кожен PR × щодня.
Браузер-специфічні баги — рідкісні, але передбачувані за класами; повільний feedback —
щоденний.

**Одна поправка, яка знімає більшу частину ризику:** позначити 2–3 cookie-критичні тести
тегом (наприклад `@cross-browser`) і ганяти **саме їх** на всіх трьох браузерах навіть на
PR. Це +[оцінка] 40 с замість +3 хв, і закриває найгірший клас. Пропоную включити.

### 10.3 Інші правки Playwright-конфігу (пропозиція, не зміна)

| Зараз (§6.6) | Пропозиція | Причина |
|---|---|---|
| `trace: 'on'` | `'on-first-retry'` | Trace для кожного тесту → 24 MB локально. У CI це важкі артефакти на кожен ран |
| `reporter: [['html'],['list']]` | + `['github']`, а для matrix — `blob` | `github`-репортер дає анотації прямо в дифі; `blob` потрібен, щоб злити 3 браузери в один звіт |
| `baseURL` захардкожений | читати `PLAYWRIGHT_BASE_URL` | Знадобиться для E2E проти preview URL |
| `webServer: npm run dev` | production build у CI | §8.4 |
| `retries: 2` у CI | лишити **поки що** | Прибирати рано: спершу треба бачити реальну стабільність. Але ретраї ховають flaky — з цим ідемо в борг свідомо |
| `authenticated` проєкт (0 тестів) | лишити, додати guard | §2.1: порожній проєкт + закоментований `globalSetup` — готова пастка vacuous success |

---

## 11. Стратегія для 7 падаючих тестів (пропозиція)

**Крок 1 (зараз, щоб розблокувати CI):** `test.fixme()` на 7 тестів із коментарем-
причиною і посиланням на цей звіт. `fixme` — не видалення: Playwright рахує їх окремо і
показує в звіті. Набір лишається 17, з них 7 явно позначені як «зламані архітектурно».

**Крок 2 (цільовий стан):** стаб-бекенд на `BACKEND_URL`.

```
CI: запускаємо крихітний HTTP-стаб на :4000
    ↓
    BACKEND_URL=http://localhost:4000 next start
    ↓
    стаб віддає детерміновані відповіді:
      401 INVALID_CREDENTIALS · 500 · timeout · 200 + Set-Cookie
    ↓
    тести керують сценарієм через заголовок або окремі шляхи
```

Чому саме тут: `auth.actions.ts:39` читає `BACKEND_URL` з env — **готовий шов**, і він
уже існує в коді. Не потрібні ні Mongo, ні сід, ні реальний `server/`. Усі 7 тестів
перевіряють реакцію UI на відповідь, і стаб дає її детерміновано.

**Крок 3 (пізніше, повільна смуга):** реальний `server/` + Mongo service-container —
для відповіді на інше питання: «чи правильно ми розмовляємо зі справжнім бекендом».

⚠️ Крок 1 змінює тестовий код, Крок 2 додає файли. **Обидва — за межами PHASE 2 і
потребують окремого твого підтвердження.** Зараз не роблю нічого.

---

## 12. PR summary (PHASE 11)

Пропоную таблицю в PR-коментарі — з явним розділенням blocking / baseline:

```
| Check           | Status | Detail                                   |
|-----------------|--------|------------------------------------------|
| Install         |   ✅   | client + server, cache hit               |
| Client types    |   ✅   | 0 errors                                 |
| Server types    |   ✅   | 0 errors                                 |
| Lint (changed)  |   ✅   | 0 new violations                         |
| Lint (baseline) |   ⚠️   | 50 errors / 10 warnings (baseline: 50)   |
| Client build    |   ✅   | 15 routes                                |
| Server build    |   ✅   | tsc clean                                |
| E2E Chromium    |   ✅   | 10 passed, 7 fixme, 0 failed             |
| Gitleaks        |   ✅   | no leaks                                 |
```

Ключове: `⚠️` для baseline, а не `✅`. Борг має **виглядати** як борг щодня, інакше
зафіксоване число стає новою нормою.

---

## 13. Файли, які планую створити/змінити на PHASE 2

> **Нічого з цього ще не створено.** Список для твого підтвердження.

### 13.1 Створити

| Файл | Призначення | Ризик |
|---|---|---|
| `.github/workflows/ci.yml` | Основний pipeline: static + build + e2e + security + report | Низький — нового немає, лише запуск наявних команд |
| `.github/workflows/ci-main.yml` | Push to main: повна матриця 3 браузери | Низький |
| `.nvmrc` | Node 22 (відповідає локальній v22.4.1) | Низький |
| `.ci/lint-baseline.json` | Зафіксоване число для ratchet (§9) | Низький |
| `.github/CODEOWNERS` | Потрібен для branch protection | Низький |

### 13.2 Змінити

| Файл | Зміна | Ризик |
|---|---|---|
| `client/package.json` | + `typecheck`, `test:e2e`, `test:e2e:ui`, `format`, `format:check`, `security`. **Версії залежностей не чіпаю** | Низький |
| `server/package.json` | + `typecheck`. `engines` | Низький |
| `package.json` (root) | + агрегувальні скрипти (`ci:*`) | Низький |
| `client/eslint.config.mjs` | + ignore для `playwright-report/`, `test-results/`, `blob-report/`, `coverage/`; + scoped override для `tests/**` (§9.3) | 🟠 **Середній — змінює число baseline. Роблю тільки після твого підтвердження** |
| `client/playwright.config.ts` | `trace`, `reporter`, `baseURL` з env, `webServer` для CI (§10.3) | 🟠 Середній — зачіпає локальний DX |

### 13.3 Окремим кроком, ДО або РАЗОМ із PHASE 2

| Дія | Чому окремо |
|---|---|
| **Закомітити `client/tests/fixtures/auth.fixture.ts`** | Це **B1**. Без нього будь-який CI червоний з першої секунди. Один коміт, нуль ризику |

### 13.4 Явно НЕ роблю на PHASE 2

- ❌ Не виправляю 52 lint errors
- ❌ Не змінюю application code (`src/**` не чіпаю взагалі)
- ❌ Не чіпаю 7 падаючих тестів (окреме підтвердження, §11)
- ❌ Не створюю Dockerfile / deployment / preview (§6.2 п.7 — deployment target відсутній;
  за правилом PHASE 9 — не вигадую)
- ❌ Не змінюю версії залежностей і не чіпаю lockfile
- ❌ Не роблю commit без твого дозволу

### 13.5 Ризики PHASE 2

| # | Ризик | Мітигація |
|---|---|---|
| R1 | E2E у CI поводиться інакше, ніж локально (1 воркер, інші таймінги, ubuntu) | Перший ран — non-blocking, вимірюємо, потім вмикаємо blocking |
| R2 | Зміна `playwright.config.ts` псує локальний DX | Усі зміни під `process.env.CI`; локальна поведінка не змінюється |
| R3 | Baseline зафіксовано до чистки ignore → число неправильне | §9.3: спочатку три чистки, потім фіксація |
| R4 | Кеш npm по неправильному ключу → «зелено, але зі старими залежностями» | Ключ = hash обох lockfile + версія Node |
| R5 | Версії GitHub Actions | Не вигадую. Де не впевнений — `TODO: перевірити` або пін по commit SHA |
| R6 | Blocking-гейти на червоній базі → звикання до червоного | Порядок: спершу B1, потім гейти. Жоден гейт не вмикається blocking, поки не був зеленим хоч раз |

---

## 14. Що потрібно від тебе перед PHASE 2

1. **Підтвердити B1** — чи можу я закомітити `auth.fixture.ts` (або зробиш сам).
2. **Підтвердити §9.3** — чи згоден на три чистки ESLint-конфігу (ignore + scoped
   override + прибрати unused disable) як передумову baseline. Це змінює число 52 → 50.
3. **Обрати стратегію для 7 тестів** — `fixme` зараз + стаб потім (моя рекомендація),
   чи інший варіант із §7.5.
4. **Підтвердити §10.2** — чи включаємо тег `@cross-browser` для cookie-критичних тестів
   на PR (+40 c).
5. **Підтвердити список файлів** із §13.

Після твого «так» переходжу до PHASE 2 і пишу перший workflow — тільки static checks,
без e2e, щоб перший зелений чекмарк з'явився на найменшому можливому наборі змін.

---

## Додаток: команди, якими отримано evidence

```bash
git status --porcelain · git rev-list --count HEAD · git branch -r · git log --oneline
git diff client/tests/fixtures/auth.fixture.ts
git worktree add --detach <tmp> HEAD && (cd <tmp>/client && npx tsc --noEmit)   # §1.2
npx tsc --noEmit                          # client (working tree) + server
npx playwright test --list                # HEAD і working tree
npx playwright test --project=chromium --reporter=list
npx playwright test --project=chromium -g "невалідні credentials"
npm run lint · npx eslint . -f json       # + аналіз розкладки по правилах/severity/файлах
which gitleaks && gitleaks version
find test-results playwright-report -name "*.js" -o -name "*.mjs" | wc -l
ls .github vercel.json Dockerfile docker-compose.yml fly.toml
cat client/eslint.config.mjs · client/tsconfig.json · client/next.config.ts · client/playwright.config.ts
git ls-files | grep -i env · cat client/.gitignore .gitignore
```

Тимчасовий worktree після перевірок видалено (`git worktree remove --force` + `prune`).
Стан репозиторію не змінено: `git status` показує ті самі 2 записи, що й до аудиту.
