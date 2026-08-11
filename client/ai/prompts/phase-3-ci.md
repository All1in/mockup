Ти працюєш як Senior/Staff DevOps + Frontend Infrastructure Engineer над існуючим production-oriented monorepo mockup.

Твоя задача — побудувати CI/CD та quality-gate інфраструктуру для цього репозиторію, спираючись на фактичний стан проекту, який потрібно спочатку проаналізувати.

ВАЖЛИВО

Не роби blind refactoring application code.

Не намагайся “зробити все зеленим” шляхом:

* вимкнення ESLint rules;
* додавання eslint-disable без обґрунтування;
* видалення тестів;
* зміни Playwright конфігурації тільки для зменшення кількості тестів;
* зміни TypeScript strictness;
* приховування помилок через || true;
* пропуску lint/test/build failures у CI;
* оновлення dependency versions без необхідності.

Мета — побудувати чесний CI/CD pipeline, який реально показує стан проекту.

⸻

Вихідний стан проекту

Client

client/package.json має:

{
"scripts": {
"dev": "next dev -p 3001",
"build": "next build",
"start": "next start",
"lint": "eslint ."
}
}

Next.js:

* Next.js 16.1.6
* React 19.2.3
* TypeScript ^5
* ESLint 9
* eslint-config-next 16.1.6
* Playwright 1.59.1

У client немає окремого typecheck script.

npm run build успішний:

✓ Compiled successfully
✓ Finished TypeScript
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Є warning:

The "middleware" file convention is deprecated.
Please use "proxy" instead.

Це не блокує build.

Server

server/package.json має:

{
"scripts": {
"build": "tsc",
"start": "node dist/index.js",
"dev": "ts-node-dev --respawn --transpile-only src/index.ts"
}
}

npm run build → tsc проходить успішно.

Окремого typecheck script немає.

Playwright

Playwright:

@playwright/test 1.59.1
playwright 1.59.1

npx playwright test --list успішний.

Результат:

Total: 51 tests in 2 files

Це:

* 17 unique tests
* Chromium
* Firefox
* WebKit

тобто:

17 × 3 = 51

Не змінюй цю матрицю без явної причини.

ESLint

npm run lint зараз:

52 errors
15 warnings
67 total

Основні категорії:

* @typescript-eslint/no-explicit-any
* react-hooks/set-state-in-effect
* react-hooks/refs
* react-hooks/purity
* react-hooks/preserve-manual-memoization
* react-hooks/incompatible-library
* react-hooks/exhaustive-deps
* react-hooks/rules-of-hooks
* react/display-name
* @typescript-eslint/ban-ts-comment
* react/no-unescaped-entities

Не виправляй ці 52 errors автоматично.

CI повинен показувати їх як existing baseline, а не приховувати.

Git

Поточна branch:

MP-004

Remote:

origin/main
origin/MP-004
origin/auth-feature
origin/feature/auth
origin/live-coding-auth-starter
origin/momot-main
origin/seva/main

Фактично активними за останнім commit date виглядають:

origin/main
origin/MP-004

Інші branches старі.

Secrets

Gitleaks установлен.

Проверка:

gitleaks git --log-opts="--all" .

Результат:

27 commits scanned
~1.53 MB scanned
no leaks found

⸻

Твоя задача

Построй полноценную CI/CD infrastructure, но делай это поэтапно.

PHASE 1 — Repository discovery

Сначала самостоятельно исследуй:

.github/
client/
server/
package.json
package-lock.json
playwright.config.*
tsconfig.*
eslint.config.*
next.config.*
Dockerfile*
docker-compose*
.env*

Определи:

1. package manager;
2. Node version;
3. client/server architecture;
4. существующие CI/CD workflows;
5. существующие test commands;
6. build commands;
7. lint configuration;
8. Playwright configuration;
9. environment variables;
10. deployment-related configuration.

Перед изменениями сформируй краткий план.

⸻

PHASE 2 — CI architecture

Предложи pipeline примерно такого уровня:

Pull Request
│
├── Install dependencies
│
├── Static checks
│   ├── Client TypeScript
│   ├── Server TypeScript
│   └── ESLint
│
├── Build
│   ├── Client
│   └── Server
│
├── Unit tests (если существуют)
│
├── Playwright E2E
│
└── Security
└── Gitleaks

Но сначала проверь существующую архитектуру и адаптируй pipeline к реальному проекту.

Не создавай ненужные jobs.

⸻

PHASE 3 — Quality gates

CI должен различать:

Blocking

* TypeScript failure
* build failure
* Playwright failure
* security leak
* configuration failure

Existing technical debt

* текущие ESLint errors

Но не скрывай ESLint errors.

Если текущий lint не может быть blocking gate без того, чтобы CI стал всегда красным, предложи стратегию:

Baseline
↓
new lint violations → blocking
existing violations → tracked technical debt
↓
gradually reduce baseline

Если для реализации baseline нужен конкретный механизм — сначала объясни его и только потом реализуй.

⸻

PHASE 4 — Playwright CI

Настрой E2E так, чтобы CI:

* запускал Playwright;
* использовал существующие 17 tests;
* сохранял HTML report;
* сохранял screenshots при failure;
* сохранял traces при необходимости;
* корректно использовал browsers;
* не хардкодил secrets;
* корректно работал с server/client startup.

Проверь, нужен ли:

webServer

в Playwright config.

Если frontend/backend должны запускаться перед E2E — настрой это корректно.

⸻

PHASE 5 — Security

Добавь Gitleaks в CI.

Важно:

* scan current repository;
* scan Git history где это возможно;
* failure при обнаружении настоящего secret;
* не выводить secret value в logs.

Также проверь .gitignore и .env*.

Не коммить реальные secrets.

⸻

PHASE 6 — Dependency / caching strategy

Используй нормальный dependency caching.

Определи:

* Node version;
* npm cache;
* lockfile-based cache key.

Не используй:

npm install

если проект уже использует lockfile и для CI корректнее:

npm ci

Не меняй lockfile без необходимости.

⸻

PHASE 7 — Build artifacts

Определи, какие artifacts действительно нужны.

Например:

Playwright HTML report
Playwright screenshots/traces
build logs

Не загружай node_modules.

Не загружай .env.

Не загружай secrets.

⸻

PHASE 8 — Branch / PR strategy

CI должен нормально работать для:

pull_request
push to main

Определи:

* какие checks обязательные;
* какие checks informational;
* где нужен deployment;
* нужен ли preview environment.

Не создавай production deployment без понимания существующего deployment target.

⸻

PHASE 9 — Preview deployment

Если deployment platform/configuration уже существует — интегрируйся с ней.

Если deployment platform отсутствует:

не придумывай production deployment.

Вместо этого подготовь:

CI
+
Preview deployment architecture proposal

и объясни, какие credentials/environment variables понадобятся.

⸻

PHASE 10 — Local developer experience

Добавь удобные локальные команды, если это действительно полезно:

lint
typecheck
build
test
e2e
e2e:ui
security

Но не создавай fake scripts.

Каждый script должен реально выполнять соответствующую проверку.

⸻

PHASE 11 — Observability of CI

CI должен давать понятный результат:

Install        ✅
Client types   ✅
Server types   ✅
Lint           ❌ 52 errors / 15 warnings
Client build   ✅
Server build   ✅
E2E            ✅/❌
Gitleaks       ✅

Если lint остается failing baseline — это должно быть явно видно.

⸻

КРИТИЧЕСКОЕ ПРАВИЛО

Перед каждым изменением:

1. прочитай существующий файл;
2. пойми текущую архитектуру;
3. минимально измени существующую структуру;
4. не удаляй существующие workflows/configuration без причины;
5. не меняй application behavior ради CI;
6. не меняй dependency versions без необходимости.

После каждого существенного изменения запускай соответствующую локальную проверку.

⸻

Что нужно сделать прямо сейчас

Начни только с PHASE 1.

Не пиши сразу весь CI.

Сначала:

1. проанализируй repository;
2. найди существующие CI/CD configuration;
3. найди все scripts;
4. найди Playwright config;
5. найди TypeScript configs;
6. найди Docker/deployment configuration;
7. найди environment variables;
8. определи фактические CI dependencies.

Затем покажи мне:

Current architecture
Current CI/CD
Current problems
Proposed CI architecture
Files that need to be created/changed
Risks

После этого жду подтверждения перед реализацией PHASE 2.

Не создавай и не изменяй CI-файлы до завершения PHASE 1.
Не делай commit.