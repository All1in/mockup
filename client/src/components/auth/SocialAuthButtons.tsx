import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { GoogleIcon, FacebookIcon } from '@/icons/CustomIcons';

type SocialAuthVariant = 'signin' | 'signup';

interface SocialAuthButtonsProps {
  variant: SocialAuthVariant;
}

const buttonText = {
  signin: { google: 'Sign in with Google', facebook: 'Sign in with Facebook' },
  signup: { google: 'Sign up with Google', facebook: 'Sign up with Facebook' },
};

export function SocialAuthButtons({ variant }: SocialAuthButtonsProps) {
  const text = buttonText[variant];
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
          onClick={() => {}}
          startIcon={<GoogleIcon />}
        >
          {text.google}
        </Button>
        <Button
          type="button"
          fullWidth
          variant="outlined"
          onClick={() => {}}
          startIcon={<FacebookIcon />}
        >
          {text.facebook}
        </Button>
      </Box>
    </>
  );
}
