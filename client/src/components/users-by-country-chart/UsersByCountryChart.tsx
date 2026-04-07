'use client';

import { memo, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useDashboardUsersByCountry } from '@/hooks/useDashboardUsersByCountry';

const COUNTRY_FLAGS: Record<string, string> = {
  IN: '🇮🇳',
  US: '🇺🇸',
  BR: '🇧🇷',
  OT: '🌍',
};

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function fmtCompact(n: number): string {
  return compactFormatter.format(n);
}

function UsersByCountryChart() {
  const theme = useTheme();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useDashboardUsersByCountry();

  const items = data?.items ?? [];
  const totalUsers = data?.totalUsers ?? 0;
  const errorMsg = error instanceof Error ? error.message : 'Failed to load users by country';

  const colors = useMemo(
    () => [
      theme.palette.primary.light,
      theme.palette.primary.main,
      theme.palette.primary.dark,
      theme.palette.grey[800],
    ],
    [
      theme.palette.primary.dark,
      theme.palette.primary.light,
      theme.palette.primary.main,
      theme.palette.grey,
    ]
  );

  return (
    <Card>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Users by country
        </Typography>

        <Box sx={{ minHeight: 8 }}>
          {isLoading ? <LinearProgress /> : null}
        </Box>

        <Box sx={{ width: '100%', height: 210, minHeight: 210 }}>
          {isLoading ? (
            <Skeleton variant="rounded" width="100%" height="100%" />
          ) : isError || items.length === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
              <Typography variant="body2" color={isError ? 'error' : 'text.secondary'}>
                {isError ? errorMsg : 'No country data available.'}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="users"
                  nameKey="countryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={0}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {items.map((item, idx) => (
                    <Cell key={item.countryCode} fill={colors[idx % colors.length]} />
                  ))}
                </Pie>
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill={theme.palette.text.primary} fontSize="34" fontWeight={700}>
                  {fmtCompact(totalUsers)}
                </text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill={theme.palette.text.secondary} fontSize="14">
                  Total
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 180 }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Box key={`country-skeleton-${idx}`} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width={36} />
                </Box>
                <Skeleton variant="rounded" width="100%" height={8} />
              </Box>
            ))
          ) : isError || items.length === 0 ? (
            <Box sx={{ minHeight: 180 }} />
          ) : (
            items.map((item, idx) => (
              <Box key={item.countryCode} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography component="span">{COUNTRY_FLAGS[item.countryCode] ?? '🏳️'}</Typography>
                    <Typography variant="body1">{item.countryName}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.percent.toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 8, borderRadius: 999, bgcolor: theme.palette.grey[300], overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${Math.max(0, Math.min(100, item.percent))}%`,
                      height: '100%',
                      bgcolor: colors[idx % colors.length],
                    }}
                  />
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Card>
  );
}

export default memo(UsersByCountryChart);
