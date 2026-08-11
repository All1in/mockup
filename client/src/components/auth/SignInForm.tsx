'use client';

import { useEffect, useActionState, startTransition } from 'react';
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
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { signInSchema, SignInFormValues } from '@/utils/signInSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInAction, SignInActionState } from '@/app/actions/auth.actions';
import { initAuthSession } from '@/lib/auth/auth';

interface SignInFormProps {
  onSuccess?: () => void;
  footerLink?: boolean;
}

const initialState: SignInActionState = { status: 'idle' };

export function SignInForm({ onSuccess, footerLink = true }: SignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [actionState, dispatch, isPending] = useActionState(signInAction, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (actionState.status !== 'success') return;

    initAuthSession(actionState.accessExpiresIn);

    if (onSuccess) {
      onSuccess();
      return;
    }
    const callbackUrl = searchParams?.get('callbackUrl');
    const isSafe = callbackUrl && callbackUrl.startsWith('/') && callbackUrl !== '/sign-in';
    router.push(isSafe ? callbackUrl : '/welcome');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionState]);

  const onSubmit = (values: SignInFormValues) => {
    const fd = new FormData();
    fd.set('email', values.email);
    fd.set('password', values.password);
    startTransition(() => dispatch(fd));
  };

  const serverError =
    actionState.status === 'error'
      ? actionState.code === 'INVALID_CREDENTIALS'
        ? 'Invalid email or password'
        : actionState.message
      : null;

  return (
    <>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
      >
        Sign in
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {serverError && (
          <Typography color="error" variant="body2" role="alert">
            {serverError}
          </Typography>
        )}

        <FormControl>
          <FormLabel htmlFor="signin-email">Email</FormLabel>
          <TextField
            {...register('email')}
            fullWidth
            id="signin-email"
            placeholder="your@email.com"
            autoComplete="email"
            variant="outlined"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </FormControl>

        <FormControl>
          <FormLabel htmlFor="signin-password">Password</FormLabel>
          <TextField
            {...register('password')}
            fullWidth
            id="signin-password"
            placeholder="••••••"
            type="password"
            autoComplete="current-password"
            variant="outlined"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </FormControl>

        <FormControlLabel
          control={<Checkbox name="remember" color="primary" />}
          label="Remember me"
        />

        <Button type="submit" fullWidth variant="contained" disabled={isPending}>
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </Box>

      <Typography sx={{ textAlign: 'center' }}>
        <Link component={NextLink} href="/forgot-password" variant="body2">
          Forgot your password?
        </Link>
      </Typography>

      <SocialAuthButtons variant="signin" />

      {footerLink && (
        <AuthFooterLink
          text="Don't have an account?"
          linkText="Sign up"
          href="/sign-up"
        />
      )}
    </>
  );
}