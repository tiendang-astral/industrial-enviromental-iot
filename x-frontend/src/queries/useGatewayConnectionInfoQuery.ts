import { useQuery } from '@tanstack/react-query'
import { getGatewayConnectionInfo } from '@/services/gatewayService'

export function useGatewayConnectionInfoQuery(gatewayId: number, enabled = true) {
  return useQuery({
    queryKey: ['gateway-connection-info', gatewayId],
    queryFn: () => getGatewayConnectionInfo(gatewayId),
    enabled: enabled && !!gatewayId,
  })
}
