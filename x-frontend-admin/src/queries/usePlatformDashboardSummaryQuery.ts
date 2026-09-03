import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { PlatformDashboardSummary } from '@/types/platformDashboard'

export function usePlatformDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['platform-dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<PlatformDashboardSummary>>(
        '/platform/dashboard/summary'
      )
      return data.data!
    },
  })
}
