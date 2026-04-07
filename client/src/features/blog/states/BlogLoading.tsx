'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function BlogLoading() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" height={260} />
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} item xs={12} sm={6} md={4}>
            <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Skeleton variant="rectangular" height={160} />
              <Box sx={{ p: 2 }}>
                <Skeleton width="70%" />
                <Skeleton width="40%" />
                <Skeleton />
                <Skeleton />
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

