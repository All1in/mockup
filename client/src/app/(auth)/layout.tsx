import { Suspense, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import ColorModeSelect from '@/shared/shared-theme/ColorModeSelect';
import { AuthContainer } from '@/components/auth/AuthContainer';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10 }} />
      <AuthContainer direction="column" justifyContent="space-between">
        <Suspense>{children}</Suspense>
      </AuthContainer>
    </>
  );
}
