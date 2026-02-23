'use client';

import { useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Button from '@mui/material/Button'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '@/lib/api/api';

export default function Welcome() {
  const { data: user, isLoading, isError } = useAuth();
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

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) router.replace('/sign-in');
  }, [isLoading, isError, user, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !user) {
    return null;
  }

  return (
     <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        Welcome to our app! U successfuly registred: <br /> {user.name}, {user.email}
        <Button variant="contained" color="primary" onClick={handleLogout}>Logout</Button>
     </div>
  ) 
}