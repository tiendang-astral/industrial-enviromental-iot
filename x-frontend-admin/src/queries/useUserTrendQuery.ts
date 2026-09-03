import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { TrendPoint, TrendRange } from '@/types/platformDashboard'

export function useUserTrendQuery(range: TrendRange) {
  return useQuery({
    queryKey: ['platform-dashboard', 'user-trend', range],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<TrendPoint[]>>(
        '/platform/dashboard/user-trend',
        { params: { range } }
      )
      return data.data!
    },
  })
}
