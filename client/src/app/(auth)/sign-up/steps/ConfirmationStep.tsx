import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import type { AccountTypeValues, PersonalDataValues } from '@/utils/signUpStepSchemas';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { confirmationSchema, type ConfirmationValues } from '@/utils/signUpStepSchemas';
import type { ServerFieldError } from '@/types/formTypes';

type Props = {
  personal: PersonalDataValues;
  account: AccountTypeValues;
  serverFieldError?: ServerFieldError | null;
  onBack: () => void;
  onEditStep: (step: 0 | 1) => void;
  onSubmit: () => Promise<void> | void;
  submitting: boolean;
};

export function ConfirmationStep({ personal, account, serverFieldError, onBack, onEditStep, onSubmit, submitting }: Props) {
  const [termsOpen, setTermsOpen] = useState(false);

  const defaultValues = useMemo<ConfirmationValues>(() => ({ termsAccepted: false as any }), []);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ConfirmationValues>({
    resolver: zodResolver(confirmationSchema),
    mode: 'onChange',
    defaultValues,
  });

  return (
    <Box component="form" onSubmit={handleSubmit(async () => onSubmit())} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {serverFieldError?.message && serverFieldError.field === 'root' && (
        <Typography variant="body2" color="error">
          {serverFieldError.message}
        </Typography>
      )}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Personal Data</Typography>
          <Link component="button" type="button" onClick={() => onEditStep(0)}>
            Edit
          </Link>
        </Box>
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            First name:
          </Typography>
          <Typography variant="body2">{personal.firstName}</Typography>
          <Typography variant="body2" color="text.secondary">
            Last name:
          </Typography>
          <Typography variant="body2">{personal.lastName}</Typography>
          <Typography variant="body2" color="text.secondary">
            Email:
          </Typography>
          <Typography variant="body2">{personal.email}</Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Account Data</Typography>
          <Link component="button" type="button" onClick={() => onEditStep(1)}>
            Edit
          </Link>
        </Box>
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Account type:
          </Typography>
          <Typography variant="body2">{account.accountType === 'business' ? 'Business' : 'Personal'}</Typography>

          {account.accountType === 'personal' ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Birth date:
              </Typography>
              <Typography variant="body2">{String((account as any).birthDate ?? '')}</Typography>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Company name:
              </Typography>
              <Typography variant="body2">{(account as any).companyName}</Typography>
              <Typography variant="body2" color="text.secondary">
                INN / EDRPOU:
              </Typography>
              <Typography variant="body2">{(account as any).inn}</Typography>
            </>
          )}
        </Box>
      </Paper>

      <Controller
        name="termsAccepted"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
            label={
              <Typography variant="body2">
                I agree with the{' '}
                <Link component="button" type="button" onClick={() => setTermsOpen(true)}>
                  terms of use
                </Link>
              </Typography>
            }
          />
        )}
      />
      {errors.termsAccepted?.message && (
        <Typography variant="caption" color="error">
          {errors.termsAccepted.message}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 1 }}>
        <Button variant="outlined" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="contained" disabled={submitting || !isValid}>
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </Box>

      <Dialog open={termsOpen} onClose={() => setTermsOpen(false)}>
        <DialogTitle>Terms of use</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {`1. Use of service\n\n2. Privacy\n\n3. Liability\n\n(Replace with real terms text)`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

