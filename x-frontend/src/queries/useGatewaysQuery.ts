import { useQuery } from '@tanstack/react-query'
import { listGateways } from '@/services/gatewayService'

export function useGatewaysQuery(tenantNodeId: number) {
  return useQuery({
    queryKey: ['gateways', tenantNodeId],
    queryFn: () => listGateways(tenantNodeId),
    enabled: !!tenantNodeId,
  })
}

/** Toàn bộ gateway trong scope user (trang "Thiết bị") — không lọc theo 1 site. */
export function useAllGatewaysQuery() {
  return useQuery({
    queryKey: ['gateways', 'all'],
    queryFn: () => listGateways(),
  })
}
