import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { TrendPoint, TrendRange } from '@/types/platformDashboard'

export function useTenantTrendQuery(range: TrendRange) {
  return useQuery({
    queryKey: ['platform-dashboard', 'tenant-trend', range],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<TrendPoint[]>>(
        '/platform/dashboard/tenant-trend',
        { params: { range } }
      )
      return data.data!
    },
  })
}
