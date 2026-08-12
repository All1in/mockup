import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DashboardActivityResponse } from '@/types/dashboardTypes';
import { getDashboardActivity } from '@/lib/api/api';

type UseDashboardActivityParams = {
  page: number;
  rowsPerPage: number;
  q?: string
};

export function useDashboardActivity({
  page,
  rowsPerPage,
  q,
}: UseDashboardActivityParams) {
  const offset = page * rowsPerPage;
  const normalizedQ = q?.trim() ?? '';

  return useQuery<DashboardActivityResponse>({
    queryKey: ['dashboard-activity', page, rowsPerPage, normalizedQ],
    queryFn: () => getDashboardActivity(rowsPerPage, offset, normalizedQ || undefined),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
}