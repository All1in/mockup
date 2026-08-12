import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

export default function Home() {
  return (
    <Box
      component="main"
      id="main-content"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ p: 3, minWidth: 280, textAlign: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Admin Panel
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button href="/sign-in" variant="contained" size="medium">
            Sign in
          </Button>
          <Button href="/sign-up" variant="outlined" size="medium">
            Sign up
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
