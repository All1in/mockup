'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { BlogPost } from '../lib/blog.types';
import { clampText, getPostMetaLine } from '../lib/blog.utils';

export function BlogPostCard(props: { post: BlogPost }) {
  const { post } = props;
  console.log('post slug', post.slug)
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardActionArea component={NextLink} href={`/blog/${post.slug}`} sx={{ height: '100%' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ height: '100%' }}>
          <CardContent sx={{ flex: 1 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={post.category} size="small" variant="outlined" />
                {post.featured && <Chip label="Featured" size="small" color="primary" variant="outlined" />}
              </Stack>
              <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                {clampText(post.title, 78)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getPostMetaLine(post)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {clampText(post.excerpt, 140)}
              </Typography>
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" sx={{ color: 'primary.main' }}>
                  Continue reading…
                </Typography>
              </Box>
            </Stack>
          </CardContent>

          <Box sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
            <CardMedia
              component="img"
              image={post.coverImage}
              alt={post.title}
              sx={{ height: { xs: 180, sm: '100%' }, width: '100%', objectFit: 'cover' }}
            />
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

