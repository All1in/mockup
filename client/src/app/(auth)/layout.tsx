'use client';

import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import AppTheme from '@/shared/shared-theme/AppTheme';
import ColorModeSelect from '@/shared/shared-theme/ColorModeSelect';
import { AuthContainer } from '@/components/auth/AuthContainer';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10 }} />
      <AuthContainer direction="column" justifyContent="space-between">
        {children}
      </AuthContainer>
    </AppTheme>
  );
}
