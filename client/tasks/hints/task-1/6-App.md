# App.tsx — роутінг

> Файл: `src/App.tsx`

## Імпорти

`Routes`, `Route` з react-router-dom, `AuthProvider`, `HomePage`, `LoginPage`, `RegisterPage`

## Структура

```tsx
<AuthProvider>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Routes>
</AuthProvider>
```

## Структура файлів після задачі 1

```
src/
├── api.ts
├── AuthContext.tsx
├── App.tsx
├── App.css
├── main.tsx
└── pages/
    ├── HomePage.tsx
    ├── LoginPage.tsx
    └── RegisterPage.tsx
```
