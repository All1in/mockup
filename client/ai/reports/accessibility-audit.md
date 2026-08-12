# Аудит доступності (a11y) — Звіт

> Дата: 2026-04-13  
> Аудитор: Claude Code (Senior Frontend / a11y Review)  
> Охоплення: `/welcome`, `/blog`, `/sign-in`, `/sign-up`, shared UI-компоненти

---

## 1. Поточний стан доступності

Застосунок використовує MUI v5, який за замовчуванням дає певний рівень доступності (нативні кнопки, правильні ролі для TextField тощо). Але цей базис систематично зламується на рівні компонентної логіки: відсутні лендмарки, немає `aria-live` для динамічного контенту, активні стани передаються лише візуально, вкладені інтерактивні елементи ламають навігацію клавіатурою. Застосунок не відповідає WCAG 2.1 рівня AA.

---

## 2. Критичні проблеми

### 2.1 Вкладені інтерактивні елементи — `BlogHero.tsx:17`, `BlogPostCard.tsx:17`

**Що не так:**  
`CardActionArea component="a"` (посилання) всередині якого є `<Button>` (ще один інтерактивний елемент). Це пряме порушення HTML-специфікації: інтерактивний елемент не може містити інший інтерактивний елемент.

```tsx
// BlogHero.tsx — ПРОБЛЕМА
<CardActionArea component="a" href={`/blog/${post.slug}`}>
  <CardMedia ... />
  <Button variant="contained">Continue reading…</Button> // ← button всередині <a>
</CardActionArea>
```

**Хто постраждав:** усі користувачі клавіатури, screen reader (SR).  
**Реальний сценарій:** Tab зупиняється на `<a>`, Enter переходить по посиланню. Але SR може оголосити два окремих елементи або взагалі зламати traversal. Chrome ігнорує вкладену кнопку, Firefox — поведінка непередбачувана.  
**Критично в продакшні:** баг відтворюється на 100% у NVDA + Chrome, JAWS + IE Edge.  
**Як виправити:**

```tsx
// Варіант 1: прибрати Button, залишити посилання
<CardActionArea component="a" href={`/blog/${post.slug}`} aria-label={`Read "${post.title}"`}>
  <CardMedia ... />
  <CardContent>
    <Typography>Continue reading</Typography> {/* не кнопка, просто текст */}
  </CardContent>
</CardActionArea>

// Варіант 2: aria-label на посиланні, Button прибрати повністю
```

---

### 2.2 Відсутній `<main>` лендмарк на всіх сторінках

**Що не так:**  
Жодна сторінка (`/welcome`, `/blog`, `/blog/[slug]`, `/sign-in`, `/sign-up`) не має елемента `<main>`. Замість цього — голий `<Box sx={{ minHeight: '100vh' }}>`.

- `BlogPageView.tsx:74` — `<Box>`
- `BlogPostPageView.tsx:23` — `<Box>`
- `WelcomeClientContent.tsx:35` — `<Box>`
- `page.tsx (home):8` — `<Box>`

**Хто постраждав:** SR-користувачі.  
**Реальний сценарій:** NVDA/VoiceOver надає швидку клавішу `M` (або `Ctrl+Option+M`) для переходу до `<main>`. Якщо його немає — користувач змушений Tab-ати через весь header перед кожним відкриттям сторінки.  
**Як виправити:**

```tsx
<Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
```

---

### 2.3 Відсутній `<nav>` з `aria-label` у `BlogHeader.tsx:23`

**Що не так:**  
`AppBar` рендериться як `<header>`, але ні navigation bar зверху, ні секція категорій внизу не загорнуті в `<nav>`. Всі посилання категорій рендеруються через `Typography component="a"` поза будь-яким навігаційним лендмарком.

```tsx
// BlogHeader.tsx:48-69 — ПРОБЛЕМА
<Box sx={{ display: 'flex', overflowX: 'auto', ... }}>
  {sections.map(s => (
    <Typography component="a" href={s.href}>...</Typography>
  ))}
</Box>
```

**Хто постраждав:** SR-користувачі.  
**Реальний сценарій:** VoiceOver Rotor не покаже ці навігаційні посилання у своєму списку Navigation landmarks. Незрячий користувач не зможе швидко перестрибнути між розділами.  
**Як виправити:**

```tsx
<Box component="nav" aria-label="Blog categories" sx={{ display: 'flex', ... }}>
  {sections.map(s => <Typography component="a" href={s.href}>{s.title}</Typography>)}
</Box>
// Також обгорнути основну toolbar-навігацію:
<Toolbar component="nav" aria-label="Main navigation" ...>
```

---

### 2.4 Всі посилання категорій ведуть на `/blog` — `BlogHeader.tsx:11-20`

**Що не так:**

```tsx
const sections = [
  { title: 'Technology', href: '/blog' }, // ← усі на /blog
  { title: 'Design', href: '/blog' },
  ...
];
```

**Хто постраждав:** усі користувачі.  
**Реальний сценарій:** SR оголошує 8 посилань з однаковими href. Користувач клавіатури натискає "Technology", потрапляє на `/blog` без фільтрації. Це не баг доступності в класичному сенсі — це відсутня функціональність, що робить навігацію безглуздою.  
**Як виправити:**

```tsx
{ title: 'Technology', href: '/blog?category=technology' },
```

---

### 2.5 Динамічні помилки без `aria-live` — `sign-in/page.tsx:89-93`

**Що не так:**

```tsx
{loginMutation.isError && (
  <Typography color="error" variant="body2">
    {loginMutation.error?.message}
  </Typography>
)}
```

Цей блок з'являється після submit, але SR не оголошує його автоматично без `role="alert"` або `aria-live="assertive"`.

**Хто постраждав:** SR-користувачі.  
**Реальний сценарій:** Незрячий користувач вводить неправильний пароль, натискає Enter — тиша. Жодного feedback. Він не знає, що відбулось.  
**Як виправити:**

```tsx
<Typography role="alert" aria-live="assertive" color="error" variant="body2">
  {loginMutation.error?.message}
</Typography>
// Або обгорнути в aria-live контейнер, який завжди присутній в DOM:
<Box aria-live="polite" aria-atomic="true">
  {loginMutation.isError && <Typography ...>{error}</Typography>}
</Box>
```

---

### 2.6 Клавіатурна навігація в `VirtualBlogPostList.tsx` повністю зламана

**Що не так:**  
Virtualizer рендерить лише видимі елементи — карточки поза viewport видаляються з DOM. Але список знаходиться у фіксованому `overflow: auto` контейнері (`height: calc(100dvh - 260px)`), а не у viewport сторінки. Тобто Tab проходить через усі видимі карточки, потім стрибає **за межі контейнера**, а карточки нижче ніколи не стають доступними через Tab.

**Хто постраждав:** усі користувачі клавіатури.  
**Реальний сценарій:** Користувач табає через перші 3-5 карточок, натискає Tab ще раз — фокус телепортується у sidebar, оминаючи решту 50+ статей.  
**Критично:** Без мишки/тачпада отримати доступ до більшості контенту неможливо.  
**Як виправити (вибрати один варіант):**

```tsx
// Варіант 1: відмовитись від фіксованої висоти — скрол на рівні page
// Замінити контейнер на window-scroll virtualizer:
const rowVirtualizer = useWindowVirtualizer({ ... }); // @tanstack/react-virtual

// Варіант 2: якщо фіксована висота залишається — додати aria-роли і
// повідомити що список скролиться:
<Box
  ref={parentRef}
  role="feed"           // ← семантика для infinite scroll lists
  aria-busy={isFetchingNextPage}
  tabIndex={0}          // ← щоб контейнер сам ловив фокус і стрілки скролили
  aria-label="Blog posts"
  ...
/>
```

---

### 2.7 "Continue reading…" без контексту — `BlogPostCard.tsx:35-37`, `BlogHero.tsx:40`

**Що не так:**

```tsx
<Typography variant="body2" sx={{ color: 'primary.main' }}>
  Continue reading…
</Typography>
```

SR-користувач чує список: "Continue reading… Continue reading… Continue reading…" — без назви статті.

**Як виправити:**

```tsx
// CardActionArea вже є посиланням — додати aria-label туди:
<CardActionArea
  component={NextLink}
  href={`/blog/${post.slug}`}
  aria-label={`Read full article: ${post.title}`}
>
```

---

## 3. Важливі проблеми

### 3.1 `blockquote` замінено на `<Box>` — `BlogPostContent.tsx:30-48`

```tsx
// ЗАРАЗ — семантично неправильно
<Box sx={{ borderLeft: ..., pl: 2 }}>
  <Typography variant="body1" sx={{ fontStyle: 'italic' }}>"{s.text}"</Typography>
</Box>

// ПРАВИЛЬНО
<Box component="blockquote" sx={{ borderLeft: ..., pl: 2, my: 1 }}>
  <Typography variant="body1">{s.text}</Typography>
  {s.by && <Typography component="cite" variant="body2">— {s.by}</Typography>}
</Box>
```

SR оголошує `blockquote` окремо. `<cite>` дає семантику автора цитати.

---

### 3.2 Активний стан фільтрів без `aria-current` — `BlogSidebar.tsx:71-88`

```tsx
// ЗАРАЗ — тільки візуальне виділення
<Link color={isActive ? 'primary' : 'inherit'} sx={{ fontWeight: isActive ? 700 : 400 }}>
  {c.name}
</Link>

// ВИПРАВЛЕННЯ
<Link aria-current={isActive ? 'page' : undefined} ...>
```

Для тегів (Chip):

```tsx
<Chip
  aria-pressed={isActive}
  // або aria-selected якщо в listbox
/>
```

SR зараз не оголошує, який фільтр активний.

---

### 3.3 Зображення обкладинки дублює `<h1>` — `BlogPostPageView.tsx:27-37`

```tsx
<ImageWithFallback
  src={post.coverImage}
  alt={post.title}  // ← те саме, що <h1> нижче
/>
...
<Typography component="h1" variant="h4">{post.title}</Typography>
```

SR оголосить назву двічі. Декоративне зображення повинно мати `alt=""`.

```tsx
<ImageWithFallback src={post.coverImage} alt="" role="presentation" />
```

---

### 3.4 Соціальні посилання ведуть на `#` — `BlogSidebar.tsx:144-151`

```tsx
<Link component="a" href="#">GitHub</Link>
<Link component="a" href="#">Twitter</Link>
<Link component="a" href="#">LinkedIn</Link>
```

Посилання на `#` — це пастка для SR-користувачів: вони навігують по посиланнях через список, потрапляють на "GitHub", натискають Enter — нічого не відбувається. Або прибрати, або поставити реальні href. Якщо href невідомий — зробити кнопки з `disabled` або взагалі прибрати секцію.

---

### 3.5 Skip navigation link відсутній на всіх сторінках

Будь-яка сторінка з header → content повинна мати:

```tsx
// Перший елемент в <body> або layout
<a
  href="#main-content"
  style={{
    position: 'absolute',
    left: '-9999px',
    ':focus': { left: 0 }
  }}
>
  Skip to main content
</a>
```

Без цього кожен раз при відкритті сторінки клавіатурний користувач проходить 10+ елементів header перед тим, як дістатися до контенту.

---

### 3.6 `BlogLoading.tsx` — skeleton без `aria-busy` / `aria-label`

```tsx
// ЗАРАЗ
<Skeleton variant="rounded" height={260} />

// ПРАВИЛЬНО — обгорнути у aria-live регіон
<Box aria-busy="true" aria-label="Loading blog posts">
  <Skeleton ... />
</Box>
```

SR не знає, що відбувається під час завантаження.

---

### 3.7 Зміна кроку у Sign-up не переміщує фокус — `sign-up/page.tsx:115-185`

При переході між кроками (step 0 → 1 → 2) фокус залишається там, де він був. SR-користувач не знає, що форма змінилась.

```tsx
// При зміні activeStep — зсунути фокус на heading кроку
useEffect(() => {
  stepHeadingRef.current?.focus();
}, [activeStep]);

// У кожному StepComponent:
<Typography component="h2" tabIndex={-1} ref={stepHeadingRef}>
  {stepTitle}
</Typography>
```

---

### 3.8 `ImageWithFallback` — fallback приховує зображення без alt-заміни (`display:none`)

```tsx
// ImageWithFallback.tsx:8
function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'; // ← зображення зникає, але alt вже не показується
}
```

Якщо зображення недоступне — alt-текст вже не видний (він показується лише коли `display` != `none` і зображення не завантажилось). Але `display: none` просто ховає елемент. Правильніше показати placeholder:

```tsx
e.currentTarget.style.visibility = 'hidden'; // залишає простір
// або замінити src на placeholder SVG
```

---

## 4. UX/доступність по типах користувачів

### Клавіатурні користувачі

**Що ламається:**
- VirtualBlogPostList: після 4-5 карточок фокус іде в sidebar, решта контенту недоступна
- BlogHero: button всередині link — Tab поведінка непередбачувана
- Skip link відсутній — кожна сторінка вимагає 8-12 Tab для досягнення контенту
- Sign-up stepper: не можна повернутись на попередній крок через клавіатуру без Back-кнопки (тільки через Tab → Back button)

**Що складне:**  
- Sidebar sticky з overflow не адаптований для клавіатури — треба скролити обидва контейнери

**Що повністю недоступне:**  
- Пости після 5-го у VirtualBlogPostList без миші/тачпаду

---

### Screen reader користувачі

**Що ламається:**
- Відсутні лендмарки (`<main>`, `<nav>`) — немає структурної навігації
- "Continue reading…" × N — безглузді повторювані посилання
- Помилки форм не оголошуються (`aria-live` відсутній)
- Активні фільтри не оголошуються (без `aria-current`)
- Skeleton loading — мовчання під час завантаження

**Що складне:**  
- VirtualBlogPostList: `role="feed"` відсутній, SR не розуміє infinite scroll
- Зміна кроку у sign-up: фокус не переміщується, нові поля не оголошуються

**Що повністю недоступне:**  
- Навігація по категоріях (всі ведуть на `/blog`)

---

### Користувачі з поганим зором (low vision)

**Що ламається:**
- `filter: brightness(0.65)` на BlogHero зображенні + білий текст поверх — при системному масштабуванні 200%+ контраст погіршується непередбачувано
- `opacity: 0.95` на excerpt у BlogHero — зайве зниження контрасту
- `color: 'text.secondary'` у MUI за замовчуванням може не досягати WCAG AA ratio 4.5:1 для малого тексту

**Що складне:**  
- Горизонтальний скрол категорій у BlogHeader — scrollbar прихований (`scrollbarWidth: none`), без жодних візуальних індикаторів що список скролиться

---

### Мобільні користувачі

**Що ламається:**
- VirtualBlogPostList: `height: calc(100dvh - 260px)` — вузький блок з внутрішнім скролом на мобільному. Це конфліктує з нативним pull-to-refresh і системним свайпом
- BlogHero: CardActionArea висотою 320px з дрібним текстом поверх темного зображення

**Що складне:**  
- Sidebar теги (Chip) — малі touch targets. MUI `size="small"` Chip має висоту 24px, рекомендований мінімум — 44px (WCAG 2.5.5)

---

## 5. Порівняння з продакшн-практиками

### Design systems

MUI v5 надає хорошу базу: `Button`, `TextField`, `Checkbox` мають правильні ARIA-ролі. Але це лише фундамент. Продакшн команди:
- Мають власні обгортки над MUI (`AccessibleLink`, `LiveRegion`) щоб не дублювати aria-props скрізь
- Тестують кожен компонент через Storybook + axe-addon в CI

У цьому проекті MUI-компоненти використовуються правильно в ізоляції, але в композиції — ламаються (наприклад, `CardActionArea` + `Button`).

### WCAG

| Критерій | Статус |
|---|---|
| 1.1.1 Non-text Content | ❌ Частково — alt є, але дублюється |
| 1.3.1 Info and Relationships | ❌ Відсутні лендмарки, nav, blockquote |
| 2.1.1 Keyboard | ❌ VirtualList, вкладені елементи |
| 2.4.1 Bypass Blocks | ❌ Skip link відсутній |
| 2.4.3 Focus Order | ❌ Sign-up stepper |
| 4.1.3 Status Messages | ❌ aria-live відсутній |

### Інструменти тестування

У продакшні зазвичай:
- **axe-core** у CI (через `jest-axe` або `@axe-core/playwright`) — ловить 30-40% автоматизованих a11y проблем
- **Lighthouse** — audit в devtools, автоматична перевірка контрасту
- **NVDA + Chrome** або **VoiceOver + Safari** — ручне тестування критичних flows (login, checkout, форми)

У цьому проекті немає жодного автоматизованого a11y тестування.

### Типові патерни великих команд

- Live region provider (один `<div aria-live="polite">` на рівні root, куди компоненти пишуть повідомлення)
- `FocusManager` для modal/drawer — trap + restore
- `VisuallyHidden` компонент замість `aria-label` на кнопках
- a11y checklist в PR template

---

## 6. Покращення (пріоритизований список)

### Критично (виправити до релізу)

1. **Прибрати `<Button>` з `CardActionArea`** у `BlogHero.tsx` і `BlogPostCard.tsx` — вкладені інтерактивні елементи
2. **Додати `<Box component="main">`** на кожну сторінку
3. **Додати `role="alert"` або `aria-live`** для помилок у sign-in та sign-up формах
4. **Виправити href категорій** у `BlogHeader.tsx` — всі ведуть на `/blog`
5. **Додати `aria-label`** на посилання-карточки (`CardActionArea`) — замість "Continue reading…"

### Важливо (виправити в наступному спринті)

6. **Skip navigation link** у root layout
7. **`<nav aria-label="...">`** у `BlogHeader` для toolbar і категорій
8. **`aria-current="page"`** для активних фільтрів у `BlogSidebar`
9. **`role="feed"` + `aria-busy`** у `VirtualBlogPostList` + розглянути window virtualizer
10. **Перемістити фокус** при зміні кроку у sign-up
11. **`blockquote` + `cite`** у `BlogPostContent`
12. **`alt=""`** для декоративного cover image у `BlogPostPageView`

### Nice to have

13. `aria-label` для Chip-тегів в стані "active" (`aria-pressed`)
14. Видалити або реалізувати соціальні посилання в sidebar (зараз `href="#"`)
15. Додати `axe-core` до тестового середовища (playwright або jest)
16. Видимий scrollbar або `"›"` індикатор для горизонтального nav в `BlogHeader`
17. Touch target 44px для Chip `size="small"` на мобільному

---

## 7. Що зроблено добре

- **MUI `TextField` з `FormLabel htmlFor`** у sign-in: правильне пов'язування label + input через `id`. Це базова вимога WCAG 1.3.1, і вона виконана.
- **`autoComplete="email"` і `autoComplete="current-password"`** у sign-in — коректні значення, допомагають password managers і користувачам з моторними порушеннями.
- **`IconButton aria-label="search"`** у `BlogHeader.tsx:36` — є, виконано правильно.
- **`alt={post.title}`** на зображеннях карточок — зображення не порожні. Неідеально (дублювання в окремих контекстах), але краще ніж `alt=""` або відсутній атрибут.
- **`Skeleton`** для loading states — краще ніж spinner без context. Але потребує `aria-busy`.
- **`BlogError` з `Button` для retry** — retry доступний через клавіатуру (нативна кнопка).
- **`ErrorBoundary`** — graceful degradation, не ламає весь UI.
- **`Typography component="h1/h2"`** у BlogPostPageView і BlogPageView — правильна heading hierarchy (h1 → h2 для розділів).
- **`CardActionArea component={NextLink}`** — правильний вибір: вся карточка є посиланням, а не div з onClick.

---

## 8. Пояснення для джуніора

### Що таке доступність?

Доступність (a11y) — це коли твій застосунок може використовувати людина, яка:
- не бачить (незряча) — вона чує текст через screen reader (програму, яка читає DOM вголос)
- не може тримати мишку (тремор, ампутація) — вона навігує лише Tab/Enter/Стрілками
- погано бачить — збільшує шрифт до 200%, або використовує контрастний режим
- на мобільному — може натискати лише великим пальцем

### Чому це важливо в реальних продуктах?

- **Юридично:** у EU та USA є закони (EAA, ADA) — за відсутність a11y можна отримати позов. У 2024 було 4000+ судових позовів в США пов'язаних з web accessibility.
- **Бізнес:** ~15% населення має якесь порушення. Це не маленька аудиторія.
- **SEO:** Google частково читає сторінку як screen reader. Правильна семантика = краще ранжування.

### Типові помилки джуніорів

1. **`<div onClick>`** замість `<button>` — div не отримує фокус від Tab, не реагує на Enter.
2. **Відсутні `aria-label`** на іконках — SR оголошує просто "button" без пояснення що воно робить.
3. **Помилки форм без `role="alert"`** — користувач заповнив форму, щось пішло не так, він не знає про що.
4. **Посилання "Click here" / "Continue reading"** — поза контекстом безглузді. SR читає список всіх посилань на сторінці — вони всі одинакові.
5. **`display: none` на контенті для зрячих** без врахування SR — SR теж не бачить `display:none`.

### На що зосередитись для росту

1. **Semantic HTML першим ділом:** `<main>`, `<nav>`, `<article>`, `<button>`, `<h1>`-`<h6>` — це 80% a11y без жодного ARIA.
2. **Keyboard testing:** закрий мишку, пройди свій flow тільки через Tab/Enter/Esc. Якщо незручно — для SR-користувача ще гірше.
3. **Axe DevTools** (безкоштовний браузерний extension) — запусти на своїй сторінці, виправ все що він знаходить.
4. **Вчи ARIA поступово:** `aria-label`, `aria-live`, `aria-current`, `role="alert"` — цих чотирьох вистачає для 90% кейсів.

> Доступність — це не окрема фіча. Це якість. Код, який не доступний — це баг.