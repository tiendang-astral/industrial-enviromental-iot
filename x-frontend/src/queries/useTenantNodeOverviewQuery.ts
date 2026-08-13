import { useQuery } from '@tanstack/react-query'
import { getTenantNodeOverview } from '@/services/tenantNodeService'

export function useTenantNodeOverviewQuery(tenantNodeId: number) {
  return useQuery({
    queryKey: ['tenant-node-overview', tenantNodeId],
    queryFn: () => getTenantNodeOverview(tenantNodeId),
    enabled: !!tenantNodeId,
  })
}
