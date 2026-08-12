'use client';

import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignInForm } from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <AuthCard variant="outlined">
      <Suspense fallback={'Loading...'}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}