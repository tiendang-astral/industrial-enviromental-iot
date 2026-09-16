import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  CreateMetricRequest,
  Metric,
  UpdateMetricRequest,
  UpdateMetricThresholdRequest,
} from '@/types/metric'

export async function listMetrics(): Promise<Metric[]> {
  const { data } = await httpClient.get<ApiEnvelope<Metric[]>>('/metrics')
  return data.data!
}

export async function createMetric(payload: CreateMetricRequest): Promise<Metric> {
  const { data } = await httpClient.post<ApiEnvelope<Metric>>('/metrics', payload)
  return data.data!
}

export async function updateMetric(id: number, payload: UpdateMetricRequest): Promise<Metric> {
  const { data } = await httpClient.put<ApiEnvelope<Metric>>(`/metrics/${id}`, payload)
  return data.data!
}

export async function deleteMetric(id: number): Promise<void> {
  await httpClient.delete(`/metrics/${id}`)
}

export async function setMetricThreshold(
  id: number,
  payload: UpdateMetricThresholdRequest
): Promise<Metric> {
  const { data } = await httpClient.put<ApiEnvelope<Metric>>(`/metrics/${id}/threshold`, payload)
  return data.data!
}

export async function resetMetricThreshold(id: number): Promise<Metric> {
  const { data } = await httpClient.delete<ApiEnvelope<Metric>>(`/metrics/${id}/threshold`)
  return data.data!
}
