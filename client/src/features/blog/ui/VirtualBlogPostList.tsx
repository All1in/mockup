'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import type { BlogPost } from '../lib/blog.types';
import { BlogPostCard } from './BlogPostCard';

type Props = {
  posts: BlogPost[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function VirtualBlogPostList(props: Props) {
  const { posts, hasNextPage, isFetchingNextPage, fetchNextPage } = props;

  const [containerOffset, setContainerOffset] = useState(0);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerOffset(node.offsetTop);
  }, []);

  const itemCount = hasNextPage ? posts.length + 1 : posts.length;

  const rowVirtualizer = useWindowVirtualizer({
    count: itemCount,
    estimateSize: () => (typeof window !== 'undefined' && window.innerWidth < 600 ? 420 : 260),
    overscan: 8,
    scrollMargin: containerOffset,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const last = virtualItems[virtualItems.length - 1];
    if (last && last.index >= posts.length) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, posts.length, fetchNextPage]);

  return (
    <Box
      ref={containerRef}
      role="feed"
      aria-busy={isFetchingNextPage}
      aria-label="Blog posts"
    >
      <Box sx={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {virtualItems.map((vItem) => {
          const isLoaderRow = hasNextPage && vItem.index === posts.length;

          return (
            <Box
              key={vItem.key}
              data-index={vItem.index}
              ref={rowVirtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vItem.start - rowVirtualizer.options.scrollMargin}px)`,
                pb: 2,
              }}
            >
              {isLoaderRow ? (
                <Stack sx={{ py: 2 }} spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {isFetchingNextPage ? 'Loading more posts…' : 'Scroll to load more'}
                  </Typography>
                </Stack>
              ) : (
                <Box
                  component="article"
                  aria-posinset={vItem.index + 1}
                  aria-setsize={hasNextPage ? -1 : posts.length}
                >
                  <BlogPostCard post={posts[vItem.index]!} />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
