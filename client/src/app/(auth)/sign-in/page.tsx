'use client';

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
import { useForm } from "react-hook-form"
import { signInSchema } from '@/utils/authSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormValues } from '@/utils/authSchemas';
import { ApiError } from '@/utils/Error';



export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  console.log('searchParams', searchParams)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',          
    reValidateMode: 'onChange',
  });

  const loginMutation = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    retry: false,
    onSuccess: () => {
      const callbackUrl = searchParams?.get('callbackUrl');
      router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/welcome');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setError('root', { type: 'server', message: 'Invalid email or password' }, {
            shouldFocus: true
          });
          return;
        }
        setError('root', { type: 'server', message: err.message }, {
          shouldFocus: true
        });
        return;
      }
      setError('root', { type: 'server', message: 'Something went wrong' }, {
        shouldFocus: true
      });
    },
  });

  const onSubmit = (data: SignInFormValues) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  return (
    <AuthCard variant="outlined">
      <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
        Sign in
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
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
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
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