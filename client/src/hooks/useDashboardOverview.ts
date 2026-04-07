import { useQuery } from '@tanstack/react-query';
import type { DashboardOverviewResponse } from '@/types/dashboardTypes';
import { getDashboardOverview } from '@/lib/api/api';

export function useDashboardOverview() {
  return useQuery<DashboardOverviewResponse>({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    retry: false,
  });
}

