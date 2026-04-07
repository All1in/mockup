'use client';

import Image from 'next/image';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { BlogHeader } from './BlogHeader';
import { BlogPostContent } from './BlogPostContent';
import { BlogSidebar } from './BlogSidebar';
import type { BlogCategoryAgg, BlogPost, BlogTagAgg } from '../lib/blog.types';
import { formatBlogDate } from '../lib/blog.utils';

export function BlogPostPageView(props: {
  post: BlogPost;
  categories: BlogCategoryAgg[];
  tags: BlogTagAgg[];
}) {
  const { post, categories, tags } = props;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <BlogHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <Button
                component={NextLink}
                href="/blog"
                variant="text"
                sx={{ width: 'fit-content', textTransform: 'none' }}
              >
                ← Back to blog
              </Button>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip label={post.category} size="small" variant="outlined" />
                {post.tags.slice(0, 6).map(t => (
                  <Chip key={t} label={t} size="small" />
                ))}
              </Stack>

              <Typography component="h1" variant="h3" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                {post.title}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {post.author.name}
                {post.author.role ? ` • ${post.author.role}` : ''} • {formatBlogDate(post.publishedAt)} •{' '}
                {post.readingTime} min read
              </Typography>

              <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <Box sx={{ position: 'relative', width: '100%', height: { xs: 220, sm: 420 }, maxHeight: 420 }}>
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(max-width: 900px) 100vw, 768px"
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              </Card>

              <Divider />

              <BlogPostContent content={post.content} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <BlogSidebar categories={categories} tags={tags} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
