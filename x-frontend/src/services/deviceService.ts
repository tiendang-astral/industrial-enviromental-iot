import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { DeviceSummary } from '@/types/dashboard'

export async function listDevices(tenantNodeId: number): Promise<DeviceSummary[]> {
  const { data } = await httpClient.get<ApiEnvelope<DeviceSummary[]>>(`/tenant-nodes/${tenantNodeId}/devices`)
  return data.data!
}
