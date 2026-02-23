import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';

interface AuthFooterLinkProps {
  text: string;
  linkText: string;
  href: string;
}

export function AuthFooterLink({ text, linkText, href }: AuthFooterLinkProps) {
  return (
    <Typography sx={{ textAlign: 'center' }}>
      {text}{' '}
      <MuiLink component={Link} href={href} variant="body2" sx={{ alignSelf: 'center' }}>
        {linkText}
      </MuiLink>
    </Typography>
  );
}
