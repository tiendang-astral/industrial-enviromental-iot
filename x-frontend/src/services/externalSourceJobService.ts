import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  CreateExternalSourceJobRequest,
  ExternalSourceJob,
  ExternalSourceJobRun,
  UpdateExternalSourceJobRequest,
} from '@/types/externalSource'

export async function listExternalSourceJobs(externalSourceId: number): Promise<ExternalSourceJob[]> {
  const { data } = await httpClient.get<ApiEnvelope<ExternalSourceJob[]>>(`/external-sources/${externalSourceId}/jobs`)
  return data.data!
}

export async function createExternalSourceJob(
  externalSourceId: number,
  payload: CreateExternalSourceJobRequest
): Promise<ExternalSourceJob> {
  const { data } = await httpClient.post<ApiEnvelope<ExternalSourceJob>>(
    `/external-sources/${externalSourceId}/jobs`,
    payload
  )
  return data.data!
}

export async function updateExternalSourceJob(
  id: number,
  payload: UpdateExternalSourceJobRequest
): Promise<ExternalSourceJob> {
  const { data } = await httpClient.put<ApiEnvelope<ExternalSourceJob>>(`/external-source-jobs/${id}`, payload)
  return data.data!
}

export async function deleteExternalSourceJob(id: number): Promise<void> {
  await httpClient.delete(`/external-source-jobs/${id}`)
}

export async function runJobNow(id: number): Promise<ExternalSourceJob> {
  const { data } = await httpClient.post<ApiEnvelope<ExternalSourceJob>>(`/external-source-jobs/${id}/run-now`)
  return data.data!
}

export async function listJobRuns(id: number, sinceHours = 12): Promise<ExternalSourceJobRun[]> {
  const { data } = await httpClient.get<ApiEnvelope<ExternalSourceJobRun[]>>(`/external-source-jobs/${id}/runs`, {
    params: { sinceHours },
  })
  return data.data!
}
