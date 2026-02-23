import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { GoogleIcon, FacebookIcon } from '@/icons/CustomIcons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type SocialAuthVariant = 'signin' | 'signup';

interface SocialAuthButtonsProps {
  variant: SocialAuthVariant;
  redirectPath?: string;
}

const buttonText = {
  signin: { google: 'Sign in with Google', facebook: 'Sign in with Facebook' },
  signup: { google: 'Sign up with Google', facebook: 'Sign up with Facebook' },
};

export function SocialAuthButtons({ variant, redirectPath = '/welcome' }: SocialAuthButtonsProps) {
  const text = buttonText[variant];
  const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;

  const handleGoogleClick = () => {
    window.location.href = `${API_URL}/auth/google?redirectPath=${encodeURIComponent(path)}`;
  };

  return (
    <>
      <Divider>
        <Typography sx={{ color: 'text.secondary' }}>or</Typography>
      </Divider>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          type="button"
          fullWidth
          variant="outlined"
          onClick={handleGoogleClick}
          startIcon={<GoogleIcon />}
        >
          {text.google}
        </Button>
        <Button
          type="button"
          fullWidth
          variant="outlined"
          startIcon={<FacebookIcon />}
        >
          {text.facebook}
        </Button>
      </Box>
    </>
  );
}
