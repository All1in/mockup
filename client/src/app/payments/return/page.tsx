import { Suspense } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PaymentReturnView } from '@/features/payments/ui/PaymentReturnView';

export default function PaymentReturnPage() {
  return (
    <Box
      component="main"
      id="main-content"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
      }}
    >
      <PrivateRoute>
        <Suspense fallback={<CircularProgress />}>
          <PaymentReturnView />
        </Suspense>
      </PrivateRoute>
    </Box>
  );
}
