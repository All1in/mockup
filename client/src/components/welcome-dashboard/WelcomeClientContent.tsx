'use client';

import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '@/lib/api/api';
import { notifyLogoutAcrossTabs } from '@/lib/auth/auth';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import WelcomeDashboard from '@/components/welcome-dashboard/WelcomeDashboard';
import NextLink from 'next/link';
import type { AuthUser } from '@/types/apiTypes';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';

const BOX_SX = {
  width: '100%',
  maxWidth: 980,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 1,
} as const;

type WelcomeInnerProps = {
  user: AuthUser;
  onLogout: () => void;
  isPending: boolean;
};

const WelcomeInner = React.memo(function WelcomeInner({ user, onLogout, isPending }: WelcomeInnerProps) {
  return (
    <>
      <Box sx={BOX_SX}>
        <Typography component="p" variant="body1" color="text.secondary">
          {user?.name && `${user.name}, `} {user?.email}
        </Typography>
        <Button onClick={onLogout} disabled={isPending}>
          {isPending ? 'Logging out...' : 'Logout'}
        </Button>
        <Button component={NextLink} href="/blog" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
          Blog
        </Button>
        <Button component={NextLink} href="/payments" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
          Payments
        </Button>
      </Box>
      <ErrorBoundary>
        <WelcomeDashboard userEmail={user?.email} />
      </ErrorBoundary>
    </>
  );
});

export default function WelcomeClientContent() {
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationKey: ['logout'],
    mutationFn: logout,
    retry: false,
    onSuccess: () => {
      notifyLogoutAcrossTabs();
      queryClient.removeQueries({ queryKey: ['me'] });
      window.location.replace('/sign-in');
    },
    onError: () => {
      notifyLogoutAcrossTabs();
      queryClient.removeQueries({ queryKey: ['me'] });
      window.location.replace('/sign-in');
    },
  });

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation.mutate]);

  return (
    <PrivateRoute>
      {(user) => (
        <WelcomeInner
          user={user}
          onLogout={handleLogout}
          isPending={logoutMutation.isPending}
        />
      )}
    </PrivateRoute>
  );
}
