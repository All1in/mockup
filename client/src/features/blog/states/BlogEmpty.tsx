'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function BlogEmpty(props: { title?: string; description?: string }) {
  const { title = 'No posts yet', description = 'Check back soon — we’re preparing something worth reading.' } = props;

  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography component="h2" variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

