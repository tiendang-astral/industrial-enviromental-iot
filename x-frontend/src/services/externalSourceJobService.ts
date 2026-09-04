import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  BackfillEstimate,
  BackfillRequest,
  BackfillTask,
  CreateExternalSourceJobRequest,
  ExternalSourceJob,
  ExternalSourceJobRun,
  PreviewResult,
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

/** Dòng MỚI NHẤT job đọc được — khác `previewQuery` vốn trả dòng cũ nhất (cursor = epoch). */
export async function sampleJobRows(id: number, limit = 10): Promise<PreviewResult> {
  const { data } = await httpClient.get<ApiEnvelope<PreviewResult>>(`/external-source-jobs/${id}/sample`, {
    params: { limit },
  })
  return data.data!
}

export async function estimateBackfill(datastreamId: number, payload: BackfillRequest): Promise<BackfillEstimate> {
  const { data } = await httpClient.post<ApiEnvelope<BackfillEstimate>>(
    `/datastreams/${datastreamId}/backfill/estimate`,
    payload
  )
  return data.data!
}

export async function createBackfill(datastreamId: number, payload: BackfillRequest): Promise<BackfillTask> {
  const { data } = await httpClient.post<ApiEnvelope<BackfillTask>>(`/datastreams/${datastreamId}/backfill`, payload)
  return data.data!
}

/** null khi kênh chưa vá lần nào. */
export async function getLatestBackfill(datastreamId: number): Promise<BackfillTask | null> {
  const { data } = await httpClient.get<ApiEnvelope<BackfillTask | null>>(`/datastreams/${datastreamId}/backfill`)
  return data.data ?? null
}
