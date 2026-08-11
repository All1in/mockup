import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function buildFilterHref(
  basePath: string,
  opts: { category?: string | null; tags?: string[] },
): string {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  for (const t of opts.tags ?? []) params.append('tags', t);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function BlogSidebar(props: {
  about?: { title: string; description: string };
  categories?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  activeCategory?: string;
  activeTags?: string[];
  basePath?: string;
}) {
  const {
    about = {
      title: 'About',
      description:
        'A production-style blog feature built with Next.js App Router, MUI, zod, axios, and React Query — modular, typed, and maintainable.',
    },
    categories = [],
    tags = [],
    activeCategory,
    activeTags = [],
    basePath = '/blog',
  } = props;

  const hasAnyFilter = Boolean(activeCategory || activeTags.length);

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

      {hasAnyFilter && (
        <Box>
          <Link href={basePath} variant="body2" underline="hover">
            Clear all filters
          </Link>
        </Box>
      )}

      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Categories
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.75}>
          {categories.slice(0, 8).map(c => {
            const isActive = activeCategory?.toLowerCase() === c.name.toLowerCase();
            const href = buildFilterHref(basePath, {
              category: isActive ? null : c.name.toLowerCase(),
              tags: activeTags.length ? activeTags : undefined,
            });
            return (
              <Typography key={c.name} variant="body2">
                <Link
                  href={href}
                  color={isActive ? 'primary' : 'inherit'}
                  underline="hover"
                  sx={{ fontWeight: isActive ? 700 : 400 }}
                >
                  {c.name}
                </Link>{' '}
                <Typography component="span" variant="body2" color="text.secondary">
                  ({c.count})
                </Typography>
              </Typography>
            );
          })}
          {categories.length === 0 && (
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
          {tags.slice(0, 14).map(t => {
            const isActive = activeTags.some(
              at => at.toLowerCase() === t.name.toLowerCase(),
            );
            const newTags = isActive
              ? activeTags.filter(at => at.toLowerCase() !== t.name.toLowerCase())
              : [...activeTags, t.name.toLowerCase()];
            const href = buildFilterHref(basePath, {
              category: activeCategory,
              tags: newTags.length ? newTags : undefined,
            });
            return (
              <Chip
                key={t.name}
                label={t.name}
                size="small"
                variant={isActive ? 'filled' : 'outlined'}
                color={isActive ? 'primary' : 'default'}
                component="a"
                href={href}
                clickable
              />
            );
          })}
          {tags.length === 0 && (
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
          <Link component="a" href="#" underline="hover">
            GitHub
          </Link>
          <Link component="a" href="#" underline="hover">
            Twitter
          </Link>
          <Link component="a" href="#" underline="hover">
            LinkedIn
          </Link>
        </Stack>
      </Box>
    </Stack>
  );
}