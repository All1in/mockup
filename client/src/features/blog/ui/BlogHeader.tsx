'use client';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import NextLink from 'next/link';

const sections = [
  { title: 'Technology', href: '/blog' },
  { title: 'Design', href: '/blog' },
  { title: 'Culture', href: '/blog' },
  { title: 'Business', href: '/blog' },
  { title: 'Politics', href: '/blog' },
  { title: 'Opinion', href: '/blog' },
  { title: 'Science', href: '/blog' },
  { title: 'Health', href: '/blog' },
];

export function BlogHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 64 }}>
          <Button component={NextLink} href="/" color="inherit" size="small" sx={{ textTransform: 'none' }}>
            Subscribe
          </Button>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography component={NextLink} href="/blog" variant="h5" color="inherit" sx={{ textDecoration: 'none' }}>
              Blog
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton aria-label="search" size="small">
              <SearchIcon fontSize="small" />
            </IconButton>
            <Button component={NextLink} href="/welcome" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
              Welcome
            </Button>
            <Button component={NextLink} href="/sign-in" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
              Sign in
            </Button>
          </Stack>
        </Toolbar>

        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            py: 1,
            gap: 2,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {sections.map(s => (
            <Typography
              key={s.title}
              component={NextLink}
              href={s.href}
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
            >
              {s.title}
            </Typography>
          ))}
        </Box>
      </Container>
    </AppBar>
  );
}

