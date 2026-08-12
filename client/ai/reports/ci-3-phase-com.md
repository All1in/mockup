# PHASE 2 — Static-check CI: baseline, cleanup, implementation

> Дата: 2026-08-11 · Гілка: `MP-004` · HEAD на момент вимірів: **`5494005`** («bug fix with auth types»)
> Попередній звіт: `ai/reports/phase3.md` (PHASE 1 — evidence)
>
> **Commit НЕ зроблено.** Усі зміни лежать у робочому дереві й чекають на твоє підтвердження.
> Не створено: E2E workflow, deployment, application-level fixes.

---

## 1. BASELINE на committed HEAD `5494005`

Зафіксовано **до** будь-яких моїх змін. Це та точка відліку, від якої вимірюється все
подальше.

| # | Перевірка | Команда | Результат | Статус |
|---|---|---|---|---|
| 1 | Client typecheck | `npx tsc --noEmit` (client) | exit 0 | ✅ **PASS** |
| 2 | Server typecheck | `npx tsc --noEmit` (server) | exit 0 | ✅ **PASS** |
| 3 | Client build | `npm run build` | `✓ Compiled successfully`, 15 роутів, **7.687 s** | ✅ **PASS** |
| 4 | Lint | `npx eslint .` | **52 errors / 15 warnings** (67 problems) | 📊 current baseline |
| 5 | Playwright collection | `npx playwright test --list` | **51 tests in 2 files** (17 × 3) | ✅ **PASS** |
| 6 | Actual E2E (Chromium) | `npx playwright test --project=chromium` | **10 passed / 7 failed** за 34.1 s | ❌ **FAIL** |
| 7 | Gitleaks | `gitleaks git --log-opts="--all" .` | 28 commits, 1.61 MB, **no leaks found** | ✅ **PASS** |

**B1 закрито тобою.** Коміт `5494005` вносить фікс `auth.fixture.ts`. Розходження
«committed HEAD vs working tree» з `phase3.md` §1 **усунене**: тепер репозиторій
тайпчекається і збирається так само, як робоче дерево. Це знімає блокер, через який
будь-який CI був би червоним із першої секунди.

Дві цифри змінилися відносно `phase3.md` — обидві очікувано:
- gitleaks: 27 → **28 комітів** (додався твій коміт), результат той самий — чисто;
- Playwright: набір і розклад падінь ідентичні (ті самі 7 тестів).

**Сім тестів, що падають** (без змін від `phase3.md` §2.2) — `tests/auth/sign-in.spec.ts`
рядки `36`, `43`, `78`, `85`, `113`, `124`, `146`. Причина архітектурна: Server Action
робить `fetch` на сервері, а `page.route()` перехоплює тільки браузер.

---

## 2. ESLint cleanup: 52 → 50

Виконано рівно три зміни з `phase3.md` §9.3. Жодне правило не вимкнено глобально,
жодного `eslint-disable` не додано, application behavior не змінено.

### 2.1 Diff

**Cleanup 1 + 2 — `client/eslint.config.mjs`**

```diff
@@ -12,7 +12,29 @@ const eslintConfig = defineConfig([
     "out/**",
     "build/**",
     "next-env.d.ts",
+
+    // Generated test artifacts. These are gitignored, but .gitignore and
+    // ESLint ignores are separate mechanisms: on a machine where the suite has
+    // been run, ESLint would otherwise lint the generated report bundles and
+    // the problem count would jump by orders of magnitude. Keeping them here
+    // makes the lint baseline independent of whether tests ran first.
+    "playwright-report/**",
+    "test-results/**",
+    "blob-report/**",
+    "playwright/.cache/**",
+    "coverage/**",
   ]),
+
+  // Playwright test files are not React. The fixture API passes a callback
+  // named `use`, which react-hooks/rules-of-hooks reads as a React Hook call
+  // outside a component. Scoping the rule off for tests/ corrects where the
+  // rule applies; it stays fully enabled for application code in src/.
+  {
+    files: ["tests/**/*.ts", "tests/**/*.tsx"],
+    rules: {
+      "react-hooks/rules-of-hooks": "off",
+    },
+  },
 ]);
```

**Cleanup 3 — п'ять мертвих директив** (`src/shared/customizations/`). Diff ідентичний
у всіх п'яти файлах:

```diff
 import { gray, orange } from '../customizations/themePrimitives';
 
-/* eslint-disable import/prefer-default-export */
 export const feedbackCustomizations: Components<Theme> = {
```

Файли: `dataDisplay.tsx`, `feedback.tsx`, `inputs.tsx`, `navigation.tsx`, `surfaces.ts`.
Правила `import/prefer-default-export` у конфізі немає — директиви не діяли ні на що.

### 2.2 Обґрунтування, чому це не «приховування помилок»

| Зміна | Що робить | Чому це не маскування |
|---|---|---|
| Ignore артефактів | Виводить згенеровані бандли зі скоупа лінтера | Це не наш код. Він не в git. Зараз число 52 залежить від того, у якій формі згенеровано HTML-репорт — це робить baseline невідтворюваним |
| Scoped override для `tests/**` | Вимикає **одне** правило **в одній** директорії | Правило застосоване до файлів, для яких не призначене: `react-hooks/rules-of-hooks` бачить параметр Playwright з іменем `use` і вважає його React-хуком. У `src/**` правило лишається повністю ввімкненим |
| Видалення 5 директив | Прибирає коментарі до неіснуючого правила | Це сміття конфігу, а не борг коду. ESLint сам їх позначав як `Unused eslint-disable directive` |

**Свідомо обрано мінімальну область.** Для `tests/**` вимкнено **тільки**
`react-hooks/rules-of-hooks`, а не весь плагін `react-hooks` — бо це єдине правило, яке
там реально спрацьовує хибно. Якщо в тестах з'являться інші false positive того самого
класу, розширимо override тоді, а не наперед.

### 2.3 Результат — точно 50/10

| Правило | До | Після | Δ |
|---|---:|---:|---|
| `@typescript-eslint/no-explicit-any` | 33e | 33e | — |
| `react-hooks/refs` | 6e | 6e | — |
| `react-hooks/exhaustive-deps` | 5w | 5w | — |
| **`(unused eslint-disable directive)`** | **5w** | **0** | **−5w** ✅ |
| `react-hooks/set-state-in-effect` | 3e | 3e | — |
| `react-hooks/incompatible-library` | 2w | 2w | — |
| `react-hooks/preserve-manual-memoization` | 2e | 2e | — |
| `@typescript-eslint/no-unused-vars` | 2w | 2w | — |
| `@typescript-eslint/ban-ts-comment` | 2e | 2e | — |
| **`react-hooks/rules-of-hooks`** | **2e** | **0** | **−2e** ✅ |
| `@next/next/no-img-element` | 1w | 1w | — |
| `react/no-unescaped-entities` | 1e | 1e | — |
| `react-hooks/purity` | 1e | 1e | — |
| `react/display-name` | 1e | 1e | — |
| `@typescript-eslint/no-empty-object-type` | 1e | 1e | — |
| **ВСЬОГО** | **52e / 15w** | **50e / 10w** | **−2e / −5w** |

**Жодне інше число не зрушилося.** Зникли рівно ті 7 проблем, які були ідентифіковані як
не-борг. Реальний борг — 50 errors — лишився недоторканим, як ти й просив.

**Baseline зафіксовано: `errors: 50`, `warnings: 10`** у `.ci/lint-baseline.json`.

### 2.4 Перевірка, що cleanup нічого не зламав

| Перевірка | Результат |
|---|---|
| `npx tsc --noEmit` (client) | exit 0 ✅ |
| `npx tsc --noEmit` (server) | exit 0 ✅ |
| `npm run build` | `✓ Compiled successfully` ✅ |

---

## 3. Статус 7 падаючих E2E

Твоє рішення виконано **буквально**: жодного `test.fixme()`, жодної зміни assertions,
жодного маскування.

| Дія | Статус |
|---|---|
| Видалити тести | ❌ не зроблено |
| Змінити assertions | ❌ не зроблено |
| `test.fixme()` / `skip` | ❌ не зроблено |
| Замаскувати падіння | ❌ не зроблено |
| Зафіксувати як known mismatch | ✅ `phase3.md` §2.3, §7.5 + цей звіт §1 |

**E2E не входить у створений workflow.** Це прямий наслідок: якби E2E-job існував зараз,
він був би червоним, і єдиними способами зробити його зеленим були б саме ті, які ти
заборонив. Тому E2E чекає на stabilized backend через `BACKEND_URL` — окремим етапом
після static CI, як ти й вказав.

Шов підтверджено в коді: `client/src/app/actions/auth.actions.ts:39` читає
`process.env.BACKEND_URL` з фолбеком на `http://localhost:4000`. Стаб не потребує ні
Mongo, ні реального `server/`.

---

## 4. Що створено і змінено

### CREATE

| Файл | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Основний pipeline. Зараз — **тільки static checks** (2 джоби: client typecheck+lint, server typecheck). Названий `ci.yml`, а не `ci-static.yml`, щоб додавання build/e2e/security не вимагало перейменування й переналаштування branch protection |
| `.nvmrc` | Node `22` у корені. Одне джерело правди для `actions/setup-node` (`node-version-file`) і для `nvm use` локально. Відповідає локальній v22.4.1 |
| `.ci/lint-baseline.json` | Зафіксований борг: `errors: 50`, `warnings: 10`. З полем `measuredOn: 5494005` і коментарем, чому саме ці числа |
| `client/scripts/lint-baseline.mjs` | Ratchet-гейт: рахує errors, порівнює з baseline, фейлить **тільки на зростання**. Друкує повну розкладку по правилах щоразу |
| `client/scripts/lint-changed.mjs` | Гейт на змінені файли: лінтує тільки те, що зачепила гілка (`BASE_REF...HEAD`), фейлить на будь-який error |

⚠️ **Два скрипти — це доповнення до списку §13 з `phase3.md`.** Там був лише
`.ci/lint-baseline.json`. Причина: механізму порівняння потрібне місце. Альтернатива —
вписати логіку прямо в YAML, але це порушує власне правило «все, що робить CI, має
запускатися однією командою локально»: логіку в YAML неможливо ні відтворити, ні
відлагодити на своїй машині.

### MODIFY

| Файл | Purpose |
|---|---|
| `client/eslint.config.mjs` | Cleanup 1+2 (§2.1): ignore артефактів + scoped override для `tests/**` |
| `client/package.json` | Скрипти `typecheck`, `lint:baseline`, `lint:changed`, `format`, `format:check` + `engines`. **Версії залежностей не змінені, lockfile не змінений** |
| `server/package.json` | Скрипт `typecheck` + `engines`. **Lint-скрипта свідомо НЕ додано** — ESLint на сервері не встановлений, і скрипт, який не виконує реальної перевірки, був би fake script |
| `package.json` (root) | Агрегатори: `typecheck`, `lint`, `lint:baseline`, `ci:static` + `engines` |
| `client/src/shared/customizations/dataDisplay.tsx` | Cleanup 3 — видалено 1 мертву директиву |
| `client/src/shared/customizations/feedback.tsx` | Cleanup 3 — те саме |
| `client/src/shared/customizations/inputs.tsx` | Cleanup 3 — те саме |
| `client/src/shared/customizations/navigation.tsx` | Cleanup 3 — те саме |
| `client/src/shared/customizations/surfaces.ts` | Cleanup 3 — те саме |

⚠️ П'ять файлів під `src/` формально є application code. Зміна в кожному — **видалення
одного рядка-коментаря**. Виконавчого коду не торкався; це один із трьох cleanup, які ти
підтвердив.

### DELETE

Нічого. Жодного файлу не видалено.

---

## 5. Ключові рішення в `ci.yml` (і відкинуті альтернативи)

| Рішення | Чому так | Що відкинуто |
|---|---|---|
| Два незалежні джоби замість спільного `setup` | `client/` і `server/` — окремі npm-проєкти без workspaces. Кожен ставить своє й іде паралельно | Спільний `setup`-job: довелося б передавати `node_modules` артефактом між джобами, а upload+download для двох джоб дорожчий за тепле відновлення npm-кешу |
| `npm ci`, не `npm install` | `install` мовчки перепише lockfile при розбіжності з `package.json` — так CI починає тестувати дерево залежностей, якого немає в жодного розробника | `npm install` |
| `concurrency` + `cancel-in-progress` | Другий пуш у гілку скасовує перший ран | Без нього — два повні пайплайни, і застарілий результат фінішує останнім |
| `fetch-depth: 0` тільки в client-джобі | `lint:changed` рахує diff проти бази PR, а дефолтний shallow-клон цього не дозволяє | Повна історія в обох джобах — серверу вона не потрібна |
| `permissions: contents: read` | Жоден крок нічого не пише | Дефолтні (ширші) права |
| На сервері немає lint-кроку | ESLint там не встановлений | Додати `"lint": "echo ok"` або поставити ESLint у цьому ж кроці — перше є fake script, друге виходить за межі static CI |
| `format:check` **не** в workflow | Див. §7 — це окреме рішення для тебе | Зробити blocking одразу |

**Версії actions.** Використано `actions/checkout@v4` і `actions/setup-node@v4.`
З цього середовища я **не перевіряв** marketplace, тому в шапці файлу стоїть
`TODO(verify)`: підтвердити, що це поточні мажори, і після цього розглянути пінінг по
commit SHA. Не вигадую версій і не видаю припущення за факт.

---

## 6. Локальні запуски: що я прогнав і що отримав

### 6.1 Позитивні перевірки

| Команда | Вивід | Exit |
|---|---|---|
| `npm run typecheck` (root → client + server) | обидва `tsc --noEmit` чисто | **0** ✅ |
| `npm run lint:baseline` | `files linted: 106` · `errors: 50 (baseline 50)` · `warnings: 10` · `PASS: lint debt did not grow.` | **0** ✅ |
| `npm run build` (client) | `✓ Compiled successfully`, 15 роутів | **0** ✅ |
| YAML-валідація `ci.yml` | `YAML parses OK`; 2 джоби, кроки розібрані коректно | **0** ✅ |

> `files linted: 106`, а не 104 — додалися два нові файли `client/scripts/*.mjs`.
> Обидва чисті: помилок не додали, baseline не зрушили.

### 6.2 Негативні перевірки (гейт має **вміти** падати)

Гейт, який ніколи не бачили червоним, — це не гейт. Перевірив обидва напрямки:

```
$ npm run lint:baseline                                    → exit 0   (50 = 50)
$ echo 'export function probe(value: any) {...}' > src/__lint_gate_probe.ts
$ npm run lint:baseline                                    → exit 1
  errors : 51 (baseline 50)
  FAIL: error count grew by 1 (50 → 51).
  Fix the new violations. Do not raise the baseline to make this pass.
$ rm src/__lint_gate_probe.ts
$ npm run lint:baseline                                    → exit 0
```

Пробний файл видалено, `git status` його не показує.

### 6.3 ⚠️ `lint:changed` на цій гілці падає — і це не баг гейта

```
$ npm run lint:changed
Lint gate for changed files (base: origin/main)
  104 file(s): ...
✖ 60 problems (50 errors, 10 warnings)
FAIL: files changed by this branch contain ESLint errors.
```

**Причина, підтверджена вимірюванням:**

```
$ git diff --name-only origin/main...HEAD | wc -l          → 174
$ ... | grep '^client/' | grep -E '\.(ts|tsx|js|jsx)$'     → 104
$ git ls-tree -r --name-only origin/main | grep -c '^client/src'  → 0
```

**`client/` на `origin/main` не існує взагалі.** Гілка `MP-004` вносить увесь клієнтський
застосунок (коміт `cb785d4 feat: add client`). Тому «змінені файли» = **всі 104**, і
`lint:changed` на цій конкретній гілці математично тотожний `lint` по всьому проєкту.

Гейт працює правильно. Атипова саме гілка: це не звичайний PR, а внесення цілої кодової
бази. Його семантика — «не залишай файл бруднішим, ніж застав» — для такої гілки не має
змісту.

**Три варіанти, рішення за тобою:**

| | Варіант | Наслідок |
|---|---|---|
| **A** *(рекомендую)* | Змержити `MP-004` → `main` як baseline-мерж, `lint:changed` стає блокуючим із наступного PR | Гейт запрацює за призначенням одразу, без винятків. Наступні PR — маленькі, гейт дешевий і осмислений |
| **B** | Лишити блокуючим зараз | PR `MP-004 → main` неможливо змержити, поки не виправлені всі 50 errors. Це кілька днів роботи перед першим зеленим CI |
| **C** | `continue-on-error: true` на цьому кроці | Технічно працює, але це рівно та «декоративна перевірка», проти якої ми домовилися. **Не рекомендую** |

Крок уже обмежений `if: github.event_name == 'pull_request'`, тож на `push: main` він не
виконується взагалі. Baseline-гейт (`lint:baseline`) при цьому **проходить** на цій
гілці — тобто static CI буде зеленим у частині, що стосується боргу.

---

## 7. Окреме рішення: Prettier

Я додав скрипти `format` / `format:check` (вони були в підтвердженому §13) і одразу
прогнав перевірку:

```
$ npx prettier --check .
[warn] Code style issues found in 104 files.
```

**Тому `format:check` НЕ вписаний у workflow.** Увімкнути його блокуючим зараз означало б
одне з двох: або CI червоний на 104 файлах, або форматуючий прохід по всьому клієнту —
а це діф на тисячі рядків, який знищить `git blame` по кодовій базі, якій два тижні.

Скрипт реальний і працює (це не fake script) — але як гейт він потребує окремого рішення.
Варіанти: (а) не гейтити взагалі поки що; (б) один PR «format everything» + гейт із
наступного дня; (в) `format:check` тільки на змінених файлах, за тим самим принципом, що
й `lint:changed`. Мій вибір — **(в)**, за тією ж логікою: новий код чистий, старий не
чіпаємо. Але це наступний крок, не цей.

---

## 8. Очікувана поведінка в GitHub Actions

Що ти маєш побачити на першому PR у `main`:

```
CI / Client — typecheck & lint      ✅ або ❌ (див. §6.3 — залежить від рішення A/B/C)
CI / Server — typecheck             ✅
```

Всередині `Client — typecheck & lint`:

```
Checkout                  ✅
Set up Node               ✅  Node 22.x з .nvmrc, npm cache
Install dependencies      ✅  npm ci
Typecheck                 ✅  0 errors
Lint (changed files)      ⚠️  див. §6.3
Lint (baseline gate)      ✅  50 errors (baseline 50) — PASS, debt did not grow
```

**[оцінка] часу на `ubuntu-latest`:** client-джоба ~1 хв 30 с (з них `npm ci` ~50 с),
server-джоба ~40 с. Паралельно → **wall clock ~1 хв 30 с**. Заміри локальні: `tsc` client
1.4–3.2 с, `eslint .` ~9 с, `tsc` server 1.9 с; множник для hosted runner ~2–3×.

**Як відкотити:** видалити `.github/workflows/ci.yml`. Решта змін (скрипти, `.nvmrc`,
конфіг ESLint) нічого не ламає й може лишитися — вони корисні й без CI.

---

## 9. Чого я НЕ робив

- ❌ Commit — робоче дерево чекає на твоє підтвердження
- ❌ E2E workflow
- ❌ Deployment / preview / Dockerfile
- ❌ Application-level fixes (окрім 5 видалених коментарів із cleanup 3)
- ❌ Виправлення 50 lint errors
- ❌ Зміни в тестах Playwright і в `playwright.config.ts`
- ❌ Зміни версій залежностей і lockfile
- ❌ `.github/CODEOWNERS` і `ci-main.yml` — вони з §13, але стосуються branch protection
  і повної матриці браузерів, тобто наступних кроків

---

## 10. Що потрібно від тебе

1. **Рішення по §6.3** — варіант A, B чи C для `lint:changed`. Це єдине, що блокує
   зелений static CI на цій гілці.
2. **Підтвердити два додаткові файли** (`client/scripts/*.mjs`) понад список §13.
3. **Дозвіл на commit.** Пропоную розбити на три логічні коміти, а не один:
   - `chore(lint): scope eslint config to source files and drop dead directives` — 6 файлів, 52 → 50
   - `chore(ci): add typecheck/lint scripts, .nvmrc and lint baseline` — скрипти, `.nvmrc`, `.ci/`, 3 × `package.json`
   - `ci: add static checks workflow` — `.github/workflows/ci.yml`
4. **Рішення по Prettier** (§7) — коли і в якій формі вмикати.

Після цього наступний крок — **stabilized backend через `BACKEND_URL`** і лише потім
E2E-job, як ти й визначив порядок.

---

## Додаток: команди для відтворення

```bash
# baseline на committed HEAD
git stash list && git status --porcelain          # має бути чисто
(cd client && npx tsc --noEmit)                   # exit 0
(cd server && npx tsc --noEmit)                   # exit 0
(cd client && npm run build)                      # ✓ Compiled successfully
(cd client && npx eslint .)                       # 52e/15w ДО cleanup, 50e/10w ПІСЛЯ
(cd client && npx playwright test --list)         # Total: 51 tests in 2 files
(cd client && npx playwright test --project=chromium)   # 10 passed / 7 failed
gitleaks git --log-opts="--all" .                 # no leaks found

# гейти
npm run typecheck                                 # root → client + server
(cd client && npm run lint:baseline)              # exit 0, PASS
(cd client && npm run lint:changed)               # див. §6.3
npm run ci:static                                 # typecheck + baseline одним рядком

# валідація workflow
ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml")'
```
