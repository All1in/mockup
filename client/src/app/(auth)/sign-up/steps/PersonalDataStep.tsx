import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputFileUpload from '@/components/input-file-upload/UploadFile';
import { personalDataSchema, type PersonalDataValues } from '@/utils/signUpStepSchemas';
import { useEmailAvailabilityQuery } from '@/hooks/useEmailAvailability';
import { getEmail } from '@/lib/api/api';
import type { ServerFieldError } from '@/types/formTypes';
import { useEffect } from 'react';

type Props = {
  initialValues: Partial<PersonalDataValues>;
  serverFieldError?: ServerFieldError | null;
  onNext: (values: PersonalDataValues) => void;
};

export function PersonalDataStep({ initialValues, serverFieldError, onNext }: Props) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<PersonalDataValues>({
    resolver: zodResolver(personalDataSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: initialValues.firstName ?? '',
      lastName: initialValues.lastName ?? '',
      email: initialValues.email ?? '',
      password: initialValues.password ?? '',
      confirmPassword: initialValues.confirmPassword ?? '',
      avatar: initialValues.avatar ?? null,
    },
  });

  useEffect(() => {
    if (!serverFieldError) return;
    const { field, message } = serverFieldError;
    if (!['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'avatar', 'root'].includes(field)) return;
    setError(field as any, { type: 'server', message });
  }, [serverFieldError?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const passwordValue = watch('password') ?? '';
  const pwChecks = {
    minLen: passwordValue.length >= 8,
    hasDigit: /\d/.test(passwordValue),
    hasUpper: /[A-Z]/.test(passwordValue),
    hasSpecial: /[^A-Za-z0-9]/.test(passwordValue),
  };
  const pwScore = (pwChecks.minLen ? 1 : 0) + (pwChecks.hasDigit ? 1 : 0) + (pwChecks.hasUpper ? 1 : 0) + (pwChecks.hasSpecial ? 1 : 0);
  const pwPercent = Math.round((pwScore / 4) * 100);
  const pwColor: 'error' | 'warning' | 'success' = pwScore <= 1 ? 'error' : pwScore === 2 ? 'warning' : 'success';

  const { checking, onBlur: checkEmailOnBlur, onChangeValue: checkEmailDebounced } = useEmailAvailabilityQuery({
    getEmail,
    debounceMs: 500,
  });

  const emailField = register('email', {
    required: true,
    onChange: (e) => {
      checkEmailDebounced(e.target.value);
    },
    onBlur: async (e) => {
      const available = await checkEmailOnBlur(e.target.value);
      if (available === false) {
        setError('email', { type: 'validate', message: 'Email вже використовується' });
      } else if (available === true) {
        if (errors.email?.message === 'Email вже використовується') clearErrors('email');
      }
    },
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onNext)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl>
        <FormLabel htmlFor="signup-first-name">First name</FormLabel>
        <TextField
          {...register('firstName')}
          fullWidth
          autoComplete="given-name"
          id="signup-first-name"
          variant="outlined"
          placeholder="John"
          error={!!errors.firstName}
          helperText={errors.firstName?.message}
        />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="signup-last-name">Last name</FormLabel>
        <TextField
          {...register('lastName')}
          fullWidth
          autoComplete="family-name"
          id="signup-last-name"
          variant="outlined"
          placeholder="Doe"
          error={!!errors.lastName}
          helperText={errors.lastName?.message}
        />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="signup-email">Email</FormLabel>
        <TextField
          {...emailField}
          fullWidth
          id="signup-email"
          placeholder="your@email.com"
          autoComplete="email"
          variant="outlined"
          error={!!errors.email}
          helperText={errors.email?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {checking ? <CircularProgress size={18} /> : null}
              </InputAdornment>
            ),
          }}
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
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={pwPercent} color={pwColor} sx={{ height: 8, borderRadius: 999 }} />
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <Typography variant="caption" color={pwChecks.minLen ? 'success.main' : 'text.secondary'}>
              {pwChecks.minLen ? '✓' : '•'} min. 8 symbols
            </Typography>
            <Typography variant="caption" color={pwChecks.hasDigit ? 'success.main' : 'text.secondary'}>
              {pwChecks.hasDigit ? '✓' : '•'} has digit
            </Typography>
            <Typography variant="caption" color={pwChecks.hasUpper ? 'success.main' : 'text.secondary'}>
              {pwChecks.hasUpper ? '✓' : '•'} has uppercase
            </Typography>
            <Typography variant="caption" color={pwChecks.hasSpecial ? 'success.main' : 'text.secondary'}>
              {pwChecks.hasSpecial ? '✓' : '•'} special (strong)
            </Typography>
          </Box>
        </Box>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="signup-confirm-password">Confirm Password</FormLabel>
        <TextField
          {...register('confirmPassword')}
          fullWidth
          id="signup-confirm-password"
          placeholder="••••••"
          type="password"
          autoComplete="new-password"
          variant="outlined"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
      </FormControl>

      <Controller
        name="avatar"
        control={control}
        render={({ field, fieldState }) => (
          <InputFileUpload
            value={field.value}
            onChange={(file) => field.onChange(file)}
            onBlur={field.onBlur}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
            label="Upload avatar"
            accept="image/jpeg,image/png"
          />
        )}
      />

      {errors.root?.message && (
        <Typography color="error" variant="body2">
          {errors.root.message}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitting || !isValid}
        sx={{
          color: '#fff',
          bgcolor: isValid ? 'grey.900' : 'grey.400',
          '&:hover': { bgcolor: isValid ? 'grey.800' : 'grey.400' },
          '&.Mui-disabled': {
            color: '#fff',
            bgcolor: 'grey.400',
            opacity: 1, 
          },
        }}
      >
        Next
      </Button>
    </Box>
  );
}

