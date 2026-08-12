import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { PinTelemetry } from '@/types/telemetry'

export async function getGatewayTelemetry(gatewayId: number, rangeMinutes = 60): Promise<PinTelemetry[]> {
  const { data } = await httpClient.get<ApiEnvelope<PinTelemetry[]>>(`/gateways/${gatewayId}/telemetry`, {
    params: { rangeMinutes },
  })
  return data.data!
}
