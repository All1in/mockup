'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '@/lib/api/api';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import WelcomeDashboard from '@/components/welcome-dashboard/WelcomeDashboard';
import NextLink from 'next/link';

export default function WelcomeClientContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationKey: ['logout'],
    mutationFn: logout,
    retry: false,
    onSuccess: () => {
      router.replace('/sign-in');
      queryClient.removeQueries({ queryKey: ['me'] });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <PrivateRoute>
      {(user) => (
        <>
          <Box
            sx={{
              width: '100%',
              maxWidth: 980,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
            }}
          >
            <Typography component="p" variant="body1" color="text.secondary">
              {user?.name && `${user.name}, `} {user?.email}
            </Typography>
            <Button
              sx={{ mt: 1 }}
              variant="contained"
              color="primary"
              onClick={handleLogout}
            >
              Logout
            </Button>

            <Button component={NextLink} href="/blog" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
              Blog
            </Button>
          </Box>

          <WelcomeDashboard userEmail={user?.email} />
        </>
      )}
    </PrivateRoute>
  );
}
