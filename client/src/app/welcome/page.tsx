'use client';

import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '@/lib/api/api';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { useAuth } from '@/hooks/useAuth';

export default function Welcome() {
  const { data: user } = useAuth();
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Welcome to our app! You successfully registered: <br /> {user?.name}, {user?.email}
        <Button style={{ marginTop: '20px' }} variant="contained" color="primary" onClick={handleLogout}>Logout</Button>
      </div>
    </PrivateRoute>
  );
}