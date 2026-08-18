import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // BACKEND_URL приходить із client/vercel.json (build.env), тобто існує лише
  // під час збірки. Rewrites нижче читають його тут і запікають у конфіг — саме
  // тому проксі працювало.
  //
  // А Server Actions виконуються під час ЗАПИТУ, уже в серверлес-функції, де
  // цієї змінної немає. `auth.actions.ts` мовчки брав фолбек
  // http://localhost:4000 — тобто стукав сам у себе — і користувач бачив
  // «Unable to reach server» замість логіну.
  //
  // `env` підставляє значення в код на етапі збірки, тобто тим самим
  // механізмом, який тут уже доведено працює. Джерело правди лишається одне —
  // build.env у vercel.json.
  env: {
    BACKEND_URL: backendUrl,
  },
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@tanstack/react-query',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      // Backend (Express) routes
      { source: '/api/check-email', destination: `${backendUrl}/api/check-email` },
      { source: '/api/check-inn', destination: `${backendUrl}/api/check-inn` },
      { source: '/api/register', destination: `${backendUrl}/api/register` },

      // Auth lives on backend (note: no /api prefix on backend)
      { source: '/auth/:path*', destination: `${backendUrl}/auth/:path*` },

      // Dashboard route is mounted on backend at /dashboard (per server/src/index.ts)
      { source: '/dashboard/:path*', destination: `${backendUrl}/dashboard/:path*` },

      // Payments live on backend; keep page routes /payments and /payments/return on Next.js.
      { source: '/payments/config', destination: `${backendUrl}/payments/config` },
      { source: '/payments/intents', destination: `${backendUrl}/payments/intents` },
      { source: '/payments/orders/:path*', destination: `${backendUrl}/payments/orders/:path*` },
      { source: '/payments/webhook', destination: `${backendUrl}/payments/webhook` },

      // Файли з об'єктного сховища. Бекенд перевіряє права й віддає 302 на
      // короткоживуче підписане посилання — статики за /uploads більше немає.
      { source: '/files/:path*', destination: `${backendUrl}/files/:path*` },

      // Health endpoint on backend
      { source: '/health', destination: `${backendUrl}/health` },

      // NOTE: intentionally no rewrite for /api/blog/:path*
      // so Next.js Route Handlers under app/api/blog handle it.
    ];
  },
};

export default nextConfig;
