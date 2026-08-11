import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { BlogContentSection } from '../lib/blog.types';

export function BlogPostContent(props: { content: BlogContentSection[] }) {
  const { content } = props;
  return (
    <Stack spacing={2} sx={{ '& img': { maxWidth: '100%', borderRadius: 2 } }}>
      {content.map((s, idx) => {
        if (s.type === 'heading') {
          const variant = s.level === 2 ? 'h5' : s.level === 3 ? 'h6' : 'subtitle1';
          return (
            <Typography key={idx} component={`h${s.level}` as any} variant={variant} sx={{ fontWeight: 800, mt: idx ? 2 : 0 }}>
              {s.text}
            </Typography>
          );
        }

        if (s.type === 'paragraph') {
          return (
            <Typography key={idx} variant="body1" sx={{ lineHeight: 1.75 }}>
              {s.text}
            </Typography>
          );
        }

        if (s.type === 'quote') {
          return (
            <Box
              key={idx}
              sx={{
                borderLeft: theme => `4px solid ${theme.palette.primary.main}`,
                pl: 2,
                py: 0.5,
                my: 1,
              }}
            >
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                “{s.text}”
              </Typography>
              {s.by && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  — {s.by}
                </Typography>
              )}
            </Box>
          );
        }

        if (s.type === 'list') {
          return (
            <Box key={idx} component="ul" sx={{ pl: 3, my: 0 }}>
              {s.items.map((it, i) => (
                <Typography key={i} component="li" variant="body1" sx={{ lineHeight: 1.75, mb: 0.5 }}>
                  {it}
                </Typography>
              ))}
            </Box>
          );
        }

        if (s.type === 'image') {
          return (
            <Stack key={idx} spacing={1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" />
              {s.caption && (
                <Typography variant="caption" color="text.secondary">
                  {s.caption}
                </Typography>
              )}
              <Divider />
            </Stack>
          );
        }

        return null;
      })}
    </Stack>
  );
}

