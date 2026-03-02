# LoginPage.tsx — додати returnTo

> Файл: `src/pages/LoginPage.tsx` — змінити існуючий з задачі 1

## Додатковий імпорт

`useSearchParams` з react-router-dom

## Змінити: `handleSubmit`

Замість `navigate('/')` зробити:

```ts
const [searchParams] = useSearchParams()
const returnTo = searchParams.get('returnTo') || '/'
navigate(returnTo, { replace: true })
```

Тепер після логіну юзер потрапляє туди куди хотів, а не завжди на головну.
