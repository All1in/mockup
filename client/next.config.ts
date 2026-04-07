import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
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

      // Static uploads served by backend
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },

      // Health endpoint on backend
      { source: '/health', destination: `${backendUrl}/health` },

      // NOTE: intentionally no rewrite for /api/blog/:path*
      // so Next.js Route Handlers under app/api/blog handle it.
    ];
  },
};

export default nextConfig;