'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { BlogHeader } from './BlogHeader';
import { BlogHero } from './BlogHero';
import { BlogSidebar } from './BlogSidebar';
import { BlogEmpty } from '../states/BlogEmpty';
import { BlogError } from '../states/BlogError';
import { BlogLoading } from '../states/BlogLoading';
import { useBlogCategories } from '../hooks/useBlogCategories';
import { useInfiniteBlogPosts } from '../hooks/useInfiniteBlogPosts';
import { VirtualBlogPostList } from './VirtualBlogPostList';
import type { BlogCategoryAgg, BlogPost, BlogTagAgg } from '../lib/blog.types';

export function BlogPageView(props: {
  /** SSR hero + LCP: rendered on server, passed as composition slot. */
  serverHero?: ReactNode | null;
  /** When set, matches featured post from server; list excludes it and no duplicate client hero. */
  serverFeaturedPost?: BlogPost | null;
  /** SSR sidebar aggregates; overwritten when React Query finishes. */
  initialSidebarCategories?: BlogCategoryAgg[];
  initialSidebarTags?: BlogTagAgg[];
}) {
  const {
    serverHero = null,
    serverFeaturedPost = null,
    initialSidebarCategories = [],
    initialSidebarTags = [],
  } = props;
  const postsQuery = useInfiniteBlogPosts(12);
  const categoriesQuery = useBlogCategories();

  const posts = useMemo(() => {
    const all = postsQuery.data?.pages.flatMap(p => p.posts) ?? [];
    const map = new Map<string, (typeof all)[number]>();
    for (const p of all) map.set(p.id, p);
    return [...map.values()];
  }, [postsQuery.data]);

  const clientFeatured = useMemo(() => posts.find(p => p.featured) ?? posts[0], [posts]);
  const featured = serverFeaturedPost ?? clientFeatured;

  const rest = useMemo(() => {
    if (!featured) return posts;
    return posts.filter(p => p.id !== featured.id);
  }, [posts, featured]);

  const showMainGrid =
    !postsQuery.isError &&
    (Boolean(serverFeaturedPost) ||
      (!postsQuery.isLoading && posts.length > 0 && Boolean(featured)));

  const sidebarCategories =
    categoriesQuery.data?.categories ?? (initialSidebarCategories.length ? initialSidebarCategories : undefined);
  const sidebarTags =
    categoriesQuery.data?.tags ?? (initialSidebarTags.length ? initialSidebarTags : undefined);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <BlogHeader />

      {serverHero}

      {postsQuery.isLoading && !serverFeaturedPost && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogLoading />
        </Container>
      )}

      {postsQuery.isError && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogError
            title="Failed to load blog"
            message="We couldn’t fetch posts right now. Please try again."
            onRetry={() => postsQuery.refetch()}
          />
        </Container>
      )}

      {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 && !serverFeaturedPost && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogEmpty />
        </Container>
      )}

      {showMainGrid && !postsQuery.isError && (
        <>
          {!serverFeaturedPost && featured && !postsQuery.isLoading && <BlogHero post={featured} />}

          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  From the blog
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {postsQuery.isLoading && serverFeaturedPost ? (
                  <StackedListSkeleton />
                ) : (
                  <VirtualBlogPostList
                    posts={rest}
                    hasNextPage={postsQuery.hasNextPage}
                    isFetchingNextPage={postsQuery.isFetchingNextPage}
                    fetchNextPage={postsQuery.fetchNextPage}
                  />
                )}

                {!postsQuery.isLoading && !postsQuery.hasNextPage && rest.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    You’ve reached the end.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <BlogSidebar categories={sidebarCategories} tags={sidebarTags} />
              </Grid>
            </Grid>
          </Container>
        </>
      )}
    </Box>
  );
}

function StackedListSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[0, 1, 2].map(i => (
        <Skeleton key={i} variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
      ))}
    </Box>
  );
}
