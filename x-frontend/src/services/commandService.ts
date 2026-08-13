import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { Command, CreateCommandRequest } from '@/types/command'

export async function createCommand(gatewayId: number, pinId: number, payload: CreateCommandRequest): Promise<Command> {
  const { data } = await httpClient.post<ApiEnvelope<Command>>(`/gateways/${gatewayId}/pins/${pinId}/commands`, payload)
  return data.data!
}
