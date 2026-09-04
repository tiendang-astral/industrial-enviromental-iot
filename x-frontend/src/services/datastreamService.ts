import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { Datastream } from '@/types/dashboard'
import type { StartFrom } from '@/types/externalSource'

export async function listDatastreams(
  tenantNodeId: number,
  includeDescendants = false
): Promise<Datastream[]> {
  const { data } = await httpClient.get<ApiEnvelope<Datastream[]>>(
    `/tenant-nodes/${tenantNodeId}/datastreams`,
    { params: includeDescendants ? { includeDescendants: true } : undefined }
  )
  return data.data!
}

export async function renameDatastream(id: number, name: string): Promise<Datastream> {
  const { data } = await httpClient.put<ApiEnvelope<Datastream>>(`/datastreams/${id}`, { name })
  return data.data!
}

export async function listDatastreamsByExternalSource(externalSourceId: number): Promise<Datastream[]> {
  const { data } = await httpClient.get<ApiEnvelope<Datastream[]>>(`/external-sources/${externalSourceId}/datastreams`)
  return data.data!
}

export interface CreateDatastreamForJobPayload {
  name: string
  metricId: number
  sourceField: string
  /** Chỉ gửi khi job đã chạy — quyết định có xếp lượt đọc lại lịch sử hay không. */
  startFrom?: StartFrom
  startFromDate?: string
}

export async function createDatastreamForJob(
  jobId: number,
  payload: CreateDatastreamForJobPayload
): Promise<Datastream> {
  const { data } = await httpClient.post<ApiEnvelope<Datastream>>(`/external-source-jobs/${jobId}/datastreams`, payload)
  return data.data!
}

export async function deleteDatastream(id: number): Promise<void> {
  await httpClient.delete(`/datastreams/${id}`)
}
