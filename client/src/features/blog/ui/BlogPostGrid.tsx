import Grid from '@mui/material/Grid';
import type { BlogPost } from '../lib/blog.types';
import { BlogPostCard } from './BlogPostCard';

export function BlogPostGrid(props: { posts: BlogPost[] }) {
  const { posts } = props;
  return (
    <Grid container spacing={2}>
      {posts.map(p => (
        <Grid key={p.id} item xs={12}>
          <BlogPostCard post={p} />
        </Grid>
      ))}
    </Grid>
  );
}

