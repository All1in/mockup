'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthCard } from '@/components/auth/AuthCard';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useMutation } from '@tanstack/react-query';
import { register } from '@/lib/api/api';
import { useRouter } from 'next/navigation';


export default function SignUpPage() {
  const [nameError, setNameError] = useState(false);
  const [nameErrorMessage, setNameErrorMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const router = useRouter();

  const registerMutation = useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      register(email, password, name),
    retry: false,
    onSuccess: () => {
      router.push('/welcome');
    },
  });

  const validateAndSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = (data.get('name') as string) ?? '';
    const email = (data.get('email') as string) ?? '';
    const password = (data.get('password') as string) ?? '';

    let isValid = true;

    if (!name.trim()) {
      setNameError(true);
      setNameErrorMessage('Name is required.');
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage('');
    }

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

    registerMutation.mutate({ name, email, password });
  };

  return (
    <AuthCard variant="outlined">
      <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
        Sign up
      </Typography>
      <Box
        component="form"
        onSubmit={validateAndSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {registerMutation.isError && (
          <Typography color="error" variant="body2">
            {registerMutation.error?.message}
          </Typography>
        )}
        <FormControl>
          <FormLabel htmlFor="signup-name">Full name</FormLabel>
          <TextField
            autoComplete="name"
            name="name"
            required
            fullWidth
            id="signup-name"
            placeholder="Jon Snow"
            error={nameError}
            helperText={nameErrorMessage}
            variant="outlined"
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="signup-email">Email</FormLabel>
          <TextField
            required
            fullWidth
            id="signup-email"
            placeholder="your@email.com"
            name="email"
            autoComplete="email"
            variant="outlined"
            error={emailError}
            helperText={emailErrorMessage}
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="signup-password">Password</FormLabel>
          <TextField
            required
            fullWidth
            name="password"
            placeholder="••••••"
            type="password"
            id="signup-password"
            autoComplete="new-password"
            variant="outlined"
            error={passwordError}
            helperText={passwordErrorMessage}
          />
        </FormControl>
        <FormControlLabel
          control={<Checkbox name="allowExtraEmails" color="primary" />}
          label="I want to receive updates via email."
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Creating account...' : 'Sign up'}
        </Button>
      </Box>
      <SocialAuthButtons variant="signup" />
      <AuthFooterLink
        text="Already have an account?"
        linkText="Sign in"
        href="/sign-in"
      />
    </AuthCard>
  );
}