'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { BlogPost } from '../lib/blog.types';

export function BlogHero(props: { post: BlogPost }) {
  const { post } = props;

  return (
    <Container maxWidth="lg" sx={{ mt: 3 }}>
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <CardActionArea component={NextLink} href={`/blog/${post.slug}`} sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="320"
            image={post.coverImage}
            alt={post.title}
            sx={{ filter: 'brightness(0.65)' }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CardContent sx={{ maxWidth: 640, color: 'common.white' }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
                {post.title}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.95, mb: 2 }}>
                {post.excerpt}
              </Typography>
              <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}>
                Continue reading…
              </Button>
            </CardContent>
          </Box>
        </CardActionArea>
      </Card>
    </Container>
  );
}

