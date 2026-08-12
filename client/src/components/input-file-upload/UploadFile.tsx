import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { UploadFileProps } from '@/types/formTypes';
import { formatFileSize } from "@/utils/helperFunctions";

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function UploadFile({
  label = 'Upload avatar',
  accept = 'image/png,image/jpeg',
  value,
  onChange,
  onBlur,
  error,
  helperText,
}: UploadFileProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handlePick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
  };

  const handleRemove = () => {
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Button component="label" variant="contained" color={error ? 'error' : 'primary'}>
        {label}
        <VisuallyHiddenInput
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handlePick}
          onBlur={onBlur}
        />
      </Button>

      {value && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {previewUrl && value.type.startsWith('image/') && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
            />
          )}
          <Typography variant="body2">{value.name}</Typography>
          <Typography variant="body2">
            {formatFileSize(value.size)}
          </Typography>
          <Button variant="text" color="error" onClick={handleRemove}>
            Remove
          </Button>
        </Box>
      )}

      {helperText && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}