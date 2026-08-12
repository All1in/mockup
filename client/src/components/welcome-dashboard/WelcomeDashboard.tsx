'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';

import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';

import type { AuthUser } from '@/types/apiTypes';
import type { DashboardMetric, DashboardMetricIconKey, DashboardQuickAction } from '@/types/dashboardTypes'
import { useDashboardOverview } from '@/hooks/useDashboardOverview';

const widgetFallback = (
  <Card>
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="text" width="45%" />
      <Skeleton variant="rounded" width="100%" height={220} />
    </Box>
  </Card>
);

const RecentActivities = dynamic(() => import('@/components/recent-activities/RecentActivities'), {
  loading: () => widgetFallback,
  ssr: false,
});

const BtcUsdtChart = dynamic(() => import('@/components/active-users-chart/BtcUsdtChart'), {
  loading: () => widgetFallback,
  ssr: false,
});

const UsersByCountryChart = dynamic(() => import('@/components/users-by-country-chart/UsersByCountryChart'), {
  loading: () => widgetFallback,
  ssr: false,
});

type WelcomeDashboardProps = {
  userEmail?: AuthUser['email'];
};

function iconForKey(iconKey: DashboardMetricIconKey): React.ReactNode {
  switch (iconKey) {
    case 'users':
      return <PeopleAltRoundedIcon />;
    case 'revenue':
      return <AccountBalanceWalletRoundedIcon />;
    case 'security':
      return <SecurityRoundedIcon />;
    case 'usage':
      return <TrendingUpRoundedIcon />;
  }
}

function WelcomeDashboard({ userEmail }: WelcomeDashboardProps) {
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErr,
  } = useDashboardOverview();
  
  const metrics: DashboardMetric[] = overview?.metrics ?? [];
  const systemHealth = overview?.systemHealth;
  const quickActions: DashboardQuickAction[] = overview?.quickActions ?? [];

  const overviewErrorMsg =
    (overviewErr instanceof Error && overviewErr.message) ? overviewErr.message : 'Failed to load overview';

  return (
    <Box sx={{ width: '100%', maxWidth: 980 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography variant="h6">Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">
                  Signed in as {userEmail ?? '—'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Overview of your workspace activity and system health.
              </Typography>
            </Box>
          </Card>
        </Grid>

        {overviewLoading ? (
          [0, 1, 2, 3].map((idx) => (
            <Grid item xs={12} sm={6} md={3} key={`metric-ph-${idx}`}>
              <Card>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <LinearProgress />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      —
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                      —
                    </Box>
                  </Box>
                  <Typography variant="h4" component="div">
                    —
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Loading..." color="default" variant="outlined" />
                    <Typography variant="body2" color="text.secondary">
                      last 30 days
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))
        ) : overviewError ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="error">
              {overviewErrorMsg}
            </Typography>
          </Grid>
        ) : (
          metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={3} key={metric.title}>
              <Card>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {metric.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                      {iconForKey(metric.iconKey)}
                    </Box>
                  </Box>
                  <Typography variant="h4" component="div">
                    {metric.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={metric.changeLabel} color={metric.chipColor} variant="outlined" />
                    <Typography variant="body2" color="text.secondary">
                      last 30 days
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))
        )}

        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RecentActivities />
            <BtcUsdtChart />
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    System health
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uptime, latency and security signals.
                  </Typography>
                  <Box sx={{ minHeight: 120 }}>
                    {overviewLoading ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="rounded" width="100%" height={6} />
                        <Skeleton variant="text" width="45%" />
                        <Skeleton variant="rounded" width="100%" height={6} />
                      </Box>
                    ) : overviewError ? (
                      <Box sx={{ minHeight: 120, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="error">
                          {overviewErrorMsg}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Uptime
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {typeof systemHealth?.uptimePercent === 'number'
                              ? `${systemHealth.uptimePercent.toFixed(2)}%`
                              : '—'}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={systemHealth?.uptimePercent ?? 0} />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Incident rate
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {typeof systemHealth?.incidentRatePercent === 'number'
                              ? `${systemHealth.incidentRatePercent.toFixed(1)}%`
                              : '—'}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            typeof systemHealth?.incidentRatePercent === 'number'
                              ? Math.max(0, Math.min(100, 100 - systemHealth.incidentRatePercent * 100))
                              : 0
                          }
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Quick actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Common tasks you can complete after registration.
                  </Typography>

                  <Box sx={{ minHeight: 170 }}>
                    {overviewLoading ? (
                      <List>
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <ListItem key={`qa-skeleton-${idx}`} disableGutters>
                            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              <Box sx={{ width: '70%' }}>
                                <Skeleton variant="text" width="80%" />
                                <Skeleton variant="text" width="60%" />
                              </Box>
                              <Skeleton variant="rounded" width={90} height={28} />
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    ) : overviewError ? (
                      <Box sx={{ minHeight: 170, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="error">
                          {overviewErrorMsg}
                        </Typography>
                      </Box>
                    ) : quickActions.length ? (
                      <List>
                        {quickActions.slice(0, 3).map((qa) => (
                          <ListItem key={qa.title} disableGutters>
                            <ListItemText primary={qa.title} secondary={qa.description} />
                            <Chip
                              label={qa.badgeLabel}
                              color={qa.badgeColor}
                              variant={qa.badgeVariant === 'outlined' ? 'outlined' : 'filled'}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ minHeight: 170, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No quick actions.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <UsersByCountryChart />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default React.memo(WelcomeDashboard);
