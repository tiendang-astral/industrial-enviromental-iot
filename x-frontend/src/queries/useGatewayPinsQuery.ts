import { useQuery } from '@tanstack/react-query'
import { listGatewayPins } from '@/services/gatewayPinService'

export function useGatewayPinsQuery(gatewayId: number) {
  return useQuery({
    queryKey: ['gateway-pins', gatewayId],
    queryFn: () => listGatewayPins(gatewayId),
    enabled: !!gatewayId,
  })
}
