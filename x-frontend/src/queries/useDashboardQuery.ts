import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/services/dashboardService'

export function useDashboardQuery(tenantNodeId: number) {
  return useQuery({
    queryKey: ['dashboard', tenantNodeId],
    queryFn: () => getDashboard(tenantNodeId),
    enabled: !!tenantNodeId,
  })
}
