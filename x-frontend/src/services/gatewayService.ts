import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { CreateGatewayRequest, Gateway, UpdateGatewayRequest } from '@/types/gateway'

export async function listGateways(tenantNodeId?: number): Promise<Gateway[]> {
  const { data } = await httpClient.get<ApiEnvelope<Gateway[]>>('/gateways', {
    params: tenantNodeId ? { tenantNodeId } : undefined,
  })
  return data.data!
}

export async function createGateway(payload: CreateGatewayRequest): Promise<Gateway> {
  const { data } = await httpClient.post<ApiEnvelope<Gateway>>('/gateways', payload)
  return data.data!
}

export async function updateGateway(id: number, payload: UpdateGatewayRequest): Promise<Gateway> {
  const { data } = await httpClient.put<ApiEnvelope<Gateway>>(`/gateways/${id}`, payload)
  return data.data!
}

export async function deleteGateway(id: number): Promise<void> {
  await httpClient.delete(`/gateways/${id}`)
}
