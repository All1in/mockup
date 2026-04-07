'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

export function BlogSidebar(props: {
  about?: { title: string; description: string };
  categories?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
}) {
  const about = props.about ?? {
    title: 'About',
    description:
      'A production-style blog feature built with Next.js App Router, MUI, zod, axios, and React Query — modular, typed, and maintainable.',
  };

  return (
    <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          {about.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {about.description}
        </Typography>
      </Paper>

      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Categories
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.75}>
          {(props.categories ?? []).slice(0, 8).map(c => (
            <Typography key={c.name} variant="body2">
              <Link component={NextLink} href="/blog" color="inherit" underline="hover">
                {c.name}
              </Link>{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                ({c.count})
              </Typography>
            </Typography>
          ))}
          {(!props.categories || props.categories.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              No categories
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Tags
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {(props.tags ?? []).slice(0, 14).map(t => (
            <Chip key={t.name} label={t.name} size="small" variant="outlined" />
          ))}
          {(!props.tags || props.tags.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              No tags
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Social
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.75}>
          <Link component={NextLink} href="/blog" underline="hover">
            GitHub
          </Link>
          <Link component={NextLink} href="/blog" underline="hover">
            Twitter
          </Link>
          <Link component={NextLink} href="/blog" underline="hover">
            LinkedIn
          </Link>
        </Stack>
      </Box>
    </Stack>
  );
}

