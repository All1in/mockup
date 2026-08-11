'use client';

import { type ReactNode, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { BlogHeader } from './BlogHeader';
import { BlogHero } from './BlogHero';
import { BlogEmpty } from '../states/BlogEmpty';
import { BlogError } from '../states/BlogError';
import { BlogLoading } from '../states/BlogLoading';
import { useInfiniteBlogPosts } from '../hooks/useInfiniteBlogPosts';
import { VirtualBlogPostList } from './VirtualBlogPostList';
import type { BlogPost } from '../lib/blog.types';
import type { BlogFilters } from '../hooks/blog.keys';

export function BlogPageView(props: {
  serverHero?: ReactNode | null;
  serverFeaturedPost?: BlogPost | null;
  sidebar?: ReactNode;
  filters?: BlogFilters;
}) {
  const {
    serverHero = null,
    serverFeaturedPost = null,
    sidebar,
    filters = {},
  } = props;

  const hasActiveFilters = Boolean(filters.category || filters.tags?.length);

  const postsQuery = useInfiniteBlogPosts(12, filters);

  const posts = useMemo(() => {
    const all = postsQuery.data?.pages.flatMap(p => p.posts) ?? [];
    const map = new Map<string, (typeof all)[number]>();
    for (const p of all) map.set(p.id, p);
    return [...map.values()];
  }, [postsQuery.data]);

  const clientFeatured = useMemo(() => posts.find(p => p.featured) ?? posts[0], [posts]);
  const featured = hasActiveFilters ? null : (serverFeaturedPost ?? clientFeatured);

  const rest = useMemo(() => {
    if (!featured) return posts;
    return posts.filter(p => p.id !== featured.id);
  }, [posts, featured]);

  const listPosts = hasActiveFilters ? posts : rest;

  const isInitialError = postsQuery.isError && !postsQuery.data;
  const isPaginationError = postsQuery.isError && Boolean(postsQuery.data);

  const filtersKey = useMemo(
    () => [filters.category ?? '', ...(filters.tags ?? []).slice().sort()].join('|'),
    [filters],
  );

  const showMainGrid =
    !isInitialError &&
    (hasActiveFilters ||
      Boolean(serverFeaturedPost) ||
      (!postsQuery.isLoading && posts.length > 0 && Boolean(featured)));

  return (
    <Box component="main" id="main-content" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <BlogHeader />

      {!hasActiveFilters && serverHero}

      {postsQuery.isLoading && !serverFeaturedPost && !hasActiveFilters && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogLoading />
        </Container>
      )}

      {isInitialError && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogError
            title="Failed to load blog"
            message="We couldn't fetch posts right now. Please try again."
            onRetry={() => postsQuery.refetch()}
          />
        </Container>
      )}

      {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 && !hasActiveFilters && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BlogEmpty />
        </Container>
      )}

      {showMainGrid && (
        <>
          {!hasActiveFilters && !serverFeaturedPost && featured && !postsQuery.isLoading && (
            <BlogHero post={featured} />
          )}

          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {hasActiveFilters ? 'Filtered results' : 'From the blog'}
                  {hasActiveFilters && postsQuery.data && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                      ({postsQuery.data.pages[0]?.total ?? 0} results)
                    </Typography>
                  )}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {postsQuery.isLoading ? (
                  <StackedListSkeleton />
                ) : listPosts.length === 0 ? (
                  <BlogEmpty />
                ) : (
                  <VirtualBlogPostList
                    key={filtersKey}
                    posts={listPosts}
                    hasNextPage={postsQuery.hasNextPage}
                    isFetchingNextPage={postsQuery.isFetchingNextPage}
                    fetchNextPage={postsQuery.fetchNextPage}
                  />
                )}

                {isPaginationError && (
                  <Alert
                    severity="warning"
                    sx={{ mt: 2 }}
                    action={
                      <Typography
                        component="button"
                        variant="body2"
                        onClick={() => postsQuery.fetchNextPage()}
                        sx={{ cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}
                      >
                        Retry
                      </Typography>
                    }
                  >
                    Failed to load the next page. Your posts above are still available.
                  </Alert>
                )}

                {!postsQuery.isLoading && !postsQuery.hasNextPage && listPosts.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    You've reached the end.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                {sidebar}
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