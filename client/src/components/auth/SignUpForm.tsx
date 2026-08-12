'use client';

import Typography from '@mui/material/Typography';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { login, registerMultipart } from '@/lib/api/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonalDataStep } from '@/app/(auth)/sign-up/steps/PersonalDataStep';
import { AccountTypeStep } from '@/app/(auth)/sign-up/steps/AccountTypeStep';
import { ConfirmationStep } from '@/app/(auth)/sign-up/steps/ConfirmationStep';
import type { AccountTypeValues, PersonalDataValues } from '@/utils/signUpStepSchemas';
import type { RegisterMultipartResponse } from '@/types/apiTypes';
import type { FieldError } from '@/types/formTypes';

function stepForField(field: string): 0 | 1 | 2 {
  if (['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'avatar'].includes(field)) return 0;
  if (['accountType', 'birthDate', 'companyName', 'inn', 'companyDocument'].includes(field)) return 1;
  return 2;
}

interface SignUpFormProps {
  onSuccess?: () => void;
  footerLink?: boolean;
}

export function SignUpForm({ onSuccess, footerLink = true }: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const steps = useMemo(() => ['Personal Data', 'Account Type', 'Confirmation'] as const, []);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

  const stepContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    stepContainerRef.current?.focus();
  }, [activeStep]);

  const [toastOpen, setToastOpen] = useState(false);
  const [personalData, setPersonalData] = useState<PersonalDataValues | null>(null);
  const [accountData, setAccountData] = useState<AccountTypeValues | null>(null);
  const [serverFieldError, setServerFieldError] = useState<FieldError | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(() => new Set([0]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(activeStep);
      return next;
    });
  }, [activeStep]);

  const registerMutation = useMutation({
    mutationKey: ['auth', 'registerMultipart'],
    mutationFn: registerMultipart,
    retry: false,
    onError: (err) => {
      console.error(err);
    },
  });

  const handleRegisterResponse = async (
    resp: RegisterMultipartResponse,
    creds: { email: string; password: string }
  ): Promise<void> => {
    if ('userId' in resp) {
      try {
        await login(creds.email, creds.password);
      } catch {
        setServerFieldError({ field: 'root', message: 'Registration succeeded, but auto-login failed. Please sign in.', nonce: Date.now() });
        return;
      }
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(2);
        return next;
      });
      setToastOpen(true);

      if (onSuccess) {
        onSuccess();
        return;
      }
      const callbackUrl = searchParams?.get('callbackUrl');
      router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/welcome');
      return;
    }

    const field = resp.field || 'root';
    setServerFieldError({ field, message: resp.error, nonce: Date.now() });
    setActiveStep(stepForField(field));
  };

  return (
    <>
      <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
        Sign up
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, idx) => (
            <Step key={label} completed={completedSteps.has(idx)}>
              <StepLabel
                optional={
                  visitedSteps.has(idx) && !completedSteps.has(idx) && idx !== activeStep ? (
                    <Typography variant="caption" color="text.secondary">Visited</Typography>
                  ) : undefined
                }
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box
        ref={stepContainerRef}
        tabIndex={-1}
        aria-label={`Step ${activeStep + 1} of ${steps.length}: ${steps[activeStep]}`}
        sx={{ mt: 3, outline: 'none' }}
      >
        {activeStep === 0 && (
          <PersonalDataStep
            initialValues={personalData ?? {}}
            serverFieldError={serverFieldError}
            onNext={(values) => {
              setPersonalData(values);
              setCompletedSteps((prev) => { const next = new Set(prev); next.add(0); return next; });
              setActiveStep(1);
            }}
          />
        )}

        {activeStep === 1 && (
          <AccountTypeStep
            initialValues={accountData ?? {}}
            serverFieldError={serverFieldError}
            onBack={() => setActiveStep(0)}
            onNext={(values) => {
              setAccountData(values);
              setCompletedSteps((prev) => { const next = new Set(prev); next.add(1); return next; });
              setActiveStep(2);
            }}
          />
        )}

        {activeStep === 2 && personalData && accountData && (
          <ConfirmationStep
            personal={personalData}
            account={accountData}
            serverFieldError={serverFieldError}
            onBack={() => setActiveStep(1)}
            onEditStep={(step) => setActiveStep(step)}
            submitting={registerMutation.isPending}
            onSubmit={async () => {
              const base = {
                firstName: personalData.firstName,
                lastName: personalData.lastName,
                email: personalData.email,
                password: personalData.password,
                confirmPassword: personalData.confirmPassword,
                avatar: personalData.avatar!,
              };
              if (accountData.accountType === 'personal') {
                const resp = await registerMutation.mutateAsync({
                  ...base,
                  accountType: 'personal',
                  birthDate: (accountData as any).birthDate ? String((accountData as any).birthDate).slice(0, 10) : undefined,
                } as any);
                await handleRegisterResponse(resp, { email: base.email, password: base.password });
              } else {
                const resp = await registerMutation.mutateAsync({
                  ...base,
                  accountType: 'business',
                  companyName: (accountData as any).companyName,
                  inn: (accountData as any).inn,
                  companyDocument: (accountData as any).companyDocument ?? undefined,
                } as any);
                await handleRegisterResponse(resp, { email: base.email, password: base.password });
              }
            }}
          />
        )}
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={2500}
        onClose={() => setToastOpen(false)}
        message="Welcome!"
      />

      <SocialAuthButtons variant="signup" />

      {footerLink && (
        <AuthFooterLink
          text="Already have an account?"
          linkText="Sign in"
          href="/sign-in"
        />
      )}
    </>
  );
}