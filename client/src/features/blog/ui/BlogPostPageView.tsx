import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { BlogHeader } from './BlogHeader';
import { BlogPostContent } from './BlogPostContent';
import { BlogSidebar } from './BlogSidebar';
import { getPostMetaLine } from '../lib/blog.utils';
import type { BlogCategoryAgg, BlogPost, BlogTagAgg } from '../lib/blog.types';

export function BlogPostPageView(props: {
  post: BlogPost;
  categories: BlogCategoryAgg[];
  tags: BlogTagAgg[];
}) {
  const { post, categories, tags } = props;

  return (
    <Box component="main" id="main-content" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <BlogHeader />

      {post.coverImage && (
        <ImageWithFallback
          src={post.coverImage}
          alt={post.title}
          sx={{
            width: '100%',
            height: { xs: 220, md: 380 },
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={post.category}
                  size="small"
                  variant="outlined"
                  component="a"
                  href={`/blog?category=${encodeURIComponent(post.category.toLowerCase())}`}
                  clickable
                />
                {post.featured && (
                  <Chip label="Featured" size="small" color="primary" variant="outlined" />
                )}
              </Stack>

              <Typography component="h1" variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {post.title}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {getPostMetaLine(post)}
              </Typography>

              <Typography variant="subtitle1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {post.excerpt}
              </Typography>

              <Divider />

              <BlogPostContent content={post.content} />

              {post.tags.length > 0 && (
                <>
                  <Divider />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {post.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        component="a"
                        href={`/blog?tags=${encodeURIComponent(tag.toLowerCase())}`}
                        clickable
                      />
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <BlogSidebar categories={categories} tags={tags} basePath="/blog" />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}