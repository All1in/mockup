'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NextLink from 'next/link';
import { getPaymentOrder } from '../api/payments.api';

function getStatusSeverity(status?: string): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'succeeded') return 'success';
  if (status === 'canceled' || status === 'creation_failed') return 'error';
  if (status === 'processing' || status === 'requires_action') return 'warning';
  return 'info';
}

export function PaymentReturnView() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId') ?? null;

  const orderQuery = useQuery({
    queryKey: ['payments', 'orders', orderId],
    queryFn: () => getPaymentOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    retry: 1,
  });

  if (!orderId) {
    return <Alert severity="warning">Payment order is missing.</Alert>;
  }

  if (orderQuery.isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const order = orderQuery.data?.order;
  const severity = getStatusSeverity(order?.status);

  return (
    <Paper
      component="section"
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 560,
        p: { xs: 2, sm: 3 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          {severity === 'success' ? <CheckCircleIcon color="success" /> : <ErrorOutlineIcon color="warning" />}
          <Typography component="h1" variant="h5">
            Payment status
          </Typography>
        </Stack>

        {orderQuery.isError || !order ? (
          <Alert severity="error">Could not load payment status.</Alert>
        ) : (
          <Alert severity={severity}>
            Order {order.id} is {order.status}.
          </Alert>
        )}

        {order?.lastError?.message && (
          <Typography color="text.secondary">{order.lastError.message}</Typography>
        )}

        <Button component={NextLink} href="/payments" variant="outlined">
          Back to checkout
        </Button>
      </Stack>
    </Paper>
  );
}
