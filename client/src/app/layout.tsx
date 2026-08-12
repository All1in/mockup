import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import Providers from './providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin panel application',
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>
            {children}
            {modal}
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
