'use client';

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
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { signUpSchema, type SignUpFormValues } from '@/utils/authSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { register as registerApi } from '@/lib/api/api'
import { ApiError } from '@/utils/Error';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',          
    reValidateMode: 'onChange',
  });

  const registerMutation = useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      registerApi(email, password, name),
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

  const onSubmit = (data: SignUpFormValues) => {
    registerMutation.mutate({ name: data.name,email: data.email, password: data.password });
  };

  return (
    <AuthCard variant="outlined">
      <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
        Sign up
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
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
            {...register('name')}
            fullWidth
            autoComplete="name"
            id="signup-name"
            variant="outlined"
            placeholder="Jon Snow"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </FormControl>
        <FormControl>
        <FormLabel htmlFor="signup-email">Email</FormLabel>
        <TextField
          {...register('email')}
          fullWidth
          id="signup-email"
          placeholder="your@email.com"
          autoComplete="email"
          variant="outlined"
          error={!!errors.email}
          helperText={errors.email?.message}
        />
      </FormControl>
      <FormControl>
      <FormLabel htmlFor="signup-password">Password</FormLabel>
      <TextField
        {...register('password')}
        fullWidth
        id="signup-password"
        placeholder="••••••"
        type="password"
        autoComplete="new-password"
        variant="outlined"
        error={!!errors.password}
        helperText={errors.password?.message}
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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Sign up'}
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