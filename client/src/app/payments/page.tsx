import Box from '@mui/material/Box';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PaymentCheckout } from '@/features/payments/ui/PaymentCheckout';

export default function PaymentsPage() {
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
        <PaymentCheckout />
      </PrivateRoute>
    </Box>
  );
}
