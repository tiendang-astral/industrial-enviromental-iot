import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { CreateGatewayPinRequest, GatewayPin, UpdateGatewayPinRequest } from '@/types/gatewayPin'

export async function listGatewayPins(gatewayId: number): Promise<GatewayPin[]> {
  const { data } = await httpClient.get<ApiEnvelope<GatewayPin[]>>(`/gateways/${gatewayId}/pins`)
  return data.data!
}

export async function createGatewayPin(gatewayId: number, payload: CreateGatewayPinRequest): Promise<GatewayPin> {
  const { data } = await httpClient.post<ApiEnvelope<GatewayPin>>(`/gateways/${gatewayId}/pins`, payload)
  return data.data!
}

export async function updateGatewayPin(
  gatewayId: number,
  pinId: number,
  payload: UpdateGatewayPinRequest
): Promise<GatewayPin> {
  const { data } = await httpClient.put<ApiEnvelope<GatewayPin>>(`/gateways/${gatewayId}/pins/${pinId}`, payload)
  return data.data!
}
