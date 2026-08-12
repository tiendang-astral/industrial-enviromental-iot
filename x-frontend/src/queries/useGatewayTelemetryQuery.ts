import { useQuery } from '@tanstack/react-query'
import { getGatewayTelemetry } from '@/services/telemetryService'

export function useGatewayTelemetryQuery(gatewayId: number, rangeMinutes = 60) {
  return useQuery({
    queryKey: ['gateway-telemetry', gatewayId, rangeMinutes],
    queryFn: () => getGatewayTelemetry(gatewayId, rangeMinutes),
    enabled: !!gatewayId,
  })
}
