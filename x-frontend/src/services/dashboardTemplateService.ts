import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { Dashboard, DashboardTemplate } from '@/types/dashboard'

export async function listDashboardTemplates(): Promise<DashboardTemplate[]> {
  const { data } = await httpClient.get<ApiEnvelope<DashboardTemplate[]>>('/dashboard-templates')
  return data.data!
}

export async function applyDashboardTemplate(tenantNodeId: number, templateId: number): Promise<Dashboard> {
  const { data } = await httpClient.post<ApiEnvelope<Dashboard>>(
    `/tenant-nodes/${tenantNodeId}/dashboard/apply-template/${templateId}`
  )
  return data.data!
}
