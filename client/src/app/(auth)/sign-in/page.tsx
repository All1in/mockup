'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/api/api';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const loginMutation = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    retry: false,
    onSuccess: () => {
      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/welcome');
    },
  });

  const validateAndSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = (data.get('email') as string) ?? '';
    const password = (data.get('password') as string) ?? '';

    let isValid = true;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password || password.length < 8) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 8 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!isValid) return;

    loginMutation.mutate({ email, password });
  };

  return (
    <AuthCard variant="outlined">
      <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
        Sign in
      </Typography>
      <Box
        component="form"
        onSubmit={validateAndSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {loginMutation.isError && (
          <Typography color="error" variant="body2">
            {loginMutation.error?.message}
          </Typography>
        )}
        <FormControl>
          <FormLabel htmlFor="signin-email">Email</FormLabel>
          <TextField
            required
            fullWidth
            id="signin-email"
            placeholder="your@email.com"
            name="email"
            autoComplete="email"
            variant="outlined"
            error={emailError}
            helperText={emailErrorMessage}
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="signin-password">Password</FormLabel>
          <TextField
            required
            fullWidth
            name="password"
            placeholder="••••••"
            type="password"
            id="signin-password"
            autoComplete="current-password"
            variant="outlined"
            error={passwordError}
            helperText={passwordErrorMessage}
          />
        </FormControl>
        <FormControlLabel
          control={<Checkbox name="remember" color="primary" />}
          label="Remember me"
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </Box>
      <Typography sx={{ textAlign: 'center' }}>
        <Link component={NextLink} href="/forgot-password" variant="body2">
          Forgot your password?
        </Link>
      </Typography>
      <SocialAuthButtons variant="signin" />
      <AuthFooterLink
        text="Don't have an account?"
        linkText="Sign up"
        href="/sign-up"
      />
    </AuthCard>
  );
}