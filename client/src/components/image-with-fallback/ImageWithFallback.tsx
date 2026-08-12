'use client';

import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material';
import type { SyntheticEvent } from 'react';

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}

export function ImageWithFallback(props: {
  src: string;
  alt: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="img"
      src={props.src}
      alt={props.alt}
      sx={props.sx}
      onError={handleImgError}
    />
  );
}
