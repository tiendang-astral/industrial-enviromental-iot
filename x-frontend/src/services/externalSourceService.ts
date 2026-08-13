import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { CreateExternalSourceRequest, ExternalSource, UpdateExternalSourceRequest } from '@/types/externalSource'

export async function listExternalSources(): Promise<ExternalSource[]> {
  const { data } = await httpClient.get<ApiEnvelope<ExternalSource[]>>('/external-sources')
  return data.data!
}

export async function createExternalSource(
  tenantNodeId: number,
  payload: CreateExternalSourceRequest
): Promise<ExternalSource> {
  const { data } = await httpClient.post<ApiEnvelope<ExternalSource>>(
    `/tenant-nodes/${tenantNodeId}/external-sources`,
    payload
  )
  return data.data!
}

export async function updateExternalSource(id: number, payload: UpdateExternalSourceRequest): Promise<ExternalSource> {
  const { data } = await httpClient.put<ApiEnvelope<ExternalSource>>(`/external-sources/${id}`, payload)
  return data.data!
}

export async function deleteExternalSource(id: number): Promise<void> {
  await httpClient.delete(`/external-sources/${id}`)
}
