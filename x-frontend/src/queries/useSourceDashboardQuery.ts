import { useQuery } from '@tanstack/react-query'
import { getSourceDashboard } from '@/services/dashboardService'

export function useSourceDashboardQuery(externalSourceId: number) {
  return useQuery({
    queryKey: ['source-dashboard', externalSourceId],
    queryFn: () => getSourceDashboard(externalSourceId),
    enabled: !!externalSourceId,
  })
}
