import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { Dashboard, Widget } from '@/types/dashboard'

export async function getDashboard(tenantNodeId: number): Promise<Dashboard> {
  const { data } = await httpClient.get<ApiEnvelope<Dashboard>>(`/tenant-nodes/${tenantNodeId}/dashboard`)
  return data.data!
}

export async function saveDashboardLayout(tenantNodeId: number, widgets: Widget[]): Promise<Dashboard> {
  const { data } = await httpClient.put<ApiEnvelope<Dashboard>>(`/tenant-nodes/${tenantNodeId}/dashboard`, {
    layoutJson: { widgets },
  })
  return data.data!
}
