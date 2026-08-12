import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { Metric } from '@/types/metric'

export async function listMetrics(): Promise<Metric[]> {
  const { data } = await httpClient.get<ApiEnvelope<Metric[]>>('/metrics')
  return data.data!
}
