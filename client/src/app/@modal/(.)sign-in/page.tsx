'use client';

import { Suspense } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { SignInForm } from '@/components/auth/SignInForm';
import { useModalClose } from '@/hooks/useModalClose';

export default function SignInModal() {
  const handleClose = useModalClose('/blog');

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth>
      <IconButton
        aria-label="Close sign in dialog"
        onClick={handleClose}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ pt: 4, pb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Suspense>
          <SignInForm onSuccess={handleClose} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}