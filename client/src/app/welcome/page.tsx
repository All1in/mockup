import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WelcomeClientContent from '@/components/welcome-dashboard/WelcomeClientContent';

export default function Welcome() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        gap: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 980,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Welcome to our app! You successfully registered
        </Typography>
      </Box>

      <WelcomeClientContent />
    </Box>
  );
}
