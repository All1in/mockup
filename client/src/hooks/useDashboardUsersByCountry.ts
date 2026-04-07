import { useQuery } from '@tanstack/react-query';
import type { DashboardUsersByCountryResponse } from '@/types/dashboardTypes';
import { getDashboardUsersByCountry } from '@/lib/api/api';

export function useDashboardUsersByCountry() {
  return useQuery<DashboardUsersByCountryResponse>({
    queryKey: ['dashboard-users-by-country'],
    queryFn: getDashboardUsersByCountry,
    retry: false,
    staleTime: 60_000,
  });
}
