import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import UploadFile from '@/components/input-file-upload/UploadFile';
import { accountTypeSchemaWithRequiredFiles as accountTypeSchema, type AccountTypeValues } from '@/utils/signUpStepSchemas';
import { useInnAvailabilityQuery } from '@/hooks/useInnAvailability';
import { getInn } from '@/lib/api/api';
import type { ServerFieldError } from '@/types/formTypes';
import { useEffect } from 'react';

type Props = {
  initialValues: Partial<AccountTypeValues>;
  serverFieldError?: ServerFieldError | null;
  onBack: () => void;
  onNext: (values: AccountTypeValues) => void;
};

export function AccountTypeStep({ initialValues, serverFieldError, onBack, onNext }: Props) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AccountTypeValues>({
    resolver: zodResolver(accountTypeSchema),
    mode: 'onBlur',
    defaultValues: {
      accountType: (initialValues as AccountTypeValues).accountType ?? 'personal',
      ...(initialValues as any),
      companyDocument: (initialValues as any).companyDocument ?? null,
    },
  });

  useEffect(() => {
    if (!serverFieldError) return;
    const { field, message } = serverFieldError;
    if (!['accountType', 'birthDate', 'companyName', 'inn', 'companyDocument', 'root'].includes(field)) return;
    setError(field as any, { type: 'server', message });
  }, [serverFieldError?.nonce]);

  const accountType = watch('accountType');

  const { checking, onBlur: checkInnOnBlur, onChangeValue: checkInnDebounced } = useInnAvailabilityQuery({
    getInn,
    debounceMs: 500,
  });

  const innField = register('inn' as any, {
    onChange: (e) => {
      checkInnDebounced(e.target.value);
    },
    onBlur: async (e) => {
      const valid = await checkInnOnBlur(e.target.value);
      if (valid === false) {
        setError('inn' as any, { type: 'validate', message: 'Код не знайдено в реєстрі' });
      } else if (valid === true) {
        if ((errors as any).inn?.message === 'Код не знайдено в реєстрі') clearErrors('inn' as any);
      }
    },
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onNext)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl>
        <FormLabel>Account Type</FormLabel>
        <Controller
          name="accountType"
          control={control}
          render={({ field }) => (
            <RadioGroup row {...field}>
              <FormControlLabel value="personal" control={<Radio />} label="Personal" />
              <FormControlLabel value="business" control={<Radio />} label="Business" />
            </RadioGroup>
          )}
        />
      </FormControl>

      {accountType === 'personal' && (
        <FormControl>
          <FormLabel htmlFor="birthDate">Birth date</FormLabel>
          <TextField
            {...register('birthDate' as any)}
            id="birthDate"
            type="date"
            fullWidth
            error={!!(errors as any).birthDate}
            helperText={(errors as any).birthDate?.message}
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
      )}

      {accountType === 'business' && (
        <>
          <FormControl>
            <FormLabel htmlFor="companyName">Company Name</FormLabel>
            <TextField
              {...register('companyName' as any)}
              id="companyName"
              placeholder="Enter company name"
              fullWidth
              error={!!(errors as any).companyName}
              helperText={(errors as any).companyName?.message}
            />
          </FormControl>

          <FormControl>
            <FormLabel htmlFor="inn">INN / EDRPOU</FormLabel>
            <TextField
              {...innField}
              id="inn"
              placeholder="Enter INN / EDRPOU"
              fullWidth
              error={!!(errors as any).inn}
              helperText={(errors as any).inn?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {checking ? <CircularProgress size={18} /> : null}
                  </InputAdornment>
                ),
              }}
            />
          </FormControl>

          <Controller
            name={'companyDocument' as any}
            control={control}
            render={({ field, fieldState }) => (
              <UploadFile
                value={field.value ?? null}
                onChange={(file) => field.onChange(file)}
                onBlur={field.onBlur}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                label="Upload Document"
                accept="application/pdf"
              />
            )}
          />
        </>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 1 }}>
        <Button variant="outlined" onClick={onBack}>
          Back
        </Button>
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
    </Box>
  );
}

