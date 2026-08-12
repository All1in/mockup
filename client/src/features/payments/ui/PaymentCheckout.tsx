'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReplayIcon from '@mui/icons-material/Replay';
import { useRouter } from 'next/navigation';
import { usePaymentCheckoutSession } from '../hooks/usePaymentCheckoutSession';
import { getStripePromise } from '../lib/stripe-client';
import type { PaymentOrder } from '../lib/payment.types';

const DEMO_PAYMENT = {
  amount: 1999,
  currency: 'usd',
  description: 'Mockup Pro subscription',
  metadata: {
    product: 'mockup_pro',
  },
} as const;

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function PaymentForm({ order }: { order: PaymentOrder }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => {
    mountedRef.current = false;
    submittingRef.current = false;
  }, []);

  const paymentElementOptions = useMemo(() => ({
    layout: 'tabs' as const,
  }), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments/return?orderId=${order.id}`,
      },
      redirect: 'if_required',
    });

    if (!mountedRef.current) return;

    submittingRef.current = false;
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message ?? 'Payment confirmation failed');
      return;
    }

    router.replace(`/payments/return?orderId=${order.id}`);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
      <PaymentElement options={paymentElementOptions} />
      {message && <Alert severity="error">{message}</Alert>}
      <Button
        type="submit"
        variant="contained"
        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />}
        disabled={!stripe || !elements || isSubmitting}
      >
        {isSubmitting ? 'Processing' : `Pay ${formatMoney(order.amount, order.currency)}`}
      </Button>
    </Box>
  );
}

export function PaymentCheckout() {
  const { configQuery, intentMutation } = usePaymentCheckoutSession(DEMO_PAYMENT);
  const intent = intentMutation.data;
  const publishableKey = intent?.publishableKey ?? configQuery.data?.publishableKey ?? null;
  const stripePromise = useMemo(
    () => publishableKey ? getStripePromise(publishableKey) : null,
    [publishableKey]
  );

  const elementsOptions = useMemo<StripeElementsOptions | null>(() => {
    if (!intent?.clientSecret) return null;

    return {
      clientSecret: intent.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          borderRadius: '6px',
        },
      },
    };
  }, [intent?.clientSecret]);

  if (configQuery.isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (configQuery.isError || !configQuery.data?.paymentsEnabled || !publishableKey) {
    return (
      <Alert severity="warning">
        Payments are not configured. Add Stripe test keys on the server to enable checkout.
      </Alert>
    );
  }

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
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h1" variant="h5">
            Demo checkout
          </Typography>
          <Typography color="text.secondary">
            {DEMO_PAYMENT.description}
          </Typography>
        </Box>

        <Divider />

        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Typography color="text.secondary">Amount</Typography>
          <Typography fontWeight={700}>
            {formatMoney(DEMO_PAYMENT.amount, DEMO_PAYMENT.currency)}
          </Typography>
        </Stack>

        {!intent && (
          <Button
            variant="contained"
            startIcon={intentMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />}
            onClick={() => intentMutation.mutate()}
            disabled={intentMutation.isPending}
          >
            {intentMutation.isPending ? 'Creating payment' : 'Start payment'}
          </Button>
        )}

        {intentMutation.isError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={() => intentMutation.mutate()}
              >
                Retry
              </Button>
            }
          >
            Payment session creation failed.
          </Alert>
        )}

        {stripePromise && elementsOptions && intent?.order && (
          <Elements
            key={intent.clientSecret}
            stripe={stripePromise}
            options={elementsOptions}
          >
            <PaymentForm order={intent.order} />
          </Elements>
        )}
      </Stack>
    </Paper>
  );
}
