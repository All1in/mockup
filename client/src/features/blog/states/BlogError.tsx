import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function BlogError(props: { title?: string; message?: string; onRetry?: () => void }) {
  const { title = 'Something went wrong', message = 'Please try again in a moment.', onRetry } = props;

  return (
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {onRetry && (
          <Button onClick={onRetry} color="inherit" variant="outlined" size="small" sx={{ width: { xs: 'fit-content' } }}>
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

