import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  CreateTenantNodeRequest,
  MoveTenantNodeRequest,
  TenantNode,
  UpdateTenantNodeRequest,
  UpdateTenantNodeStatusRequest,
} from '@/types/tenantNode'

export async function listTenantNodes(): Promise<TenantNode[]> {
  const { data } = await httpClient.get<ApiEnvelope<TenantNode[]>>('/tenant-nodes')
  return data.data!
}

export async function createTenantNode(payload: CreateTenantNodeRequest): Promise<TenantNode> {
  const { data } = await httpClient.post<ApiEnvelope<TenantNode>>('/tenant-nodes', payload)
  return data.data!
}

export async function renameTenantNode(id: number, payload: UpdateTenantNodeRequest): Promise<TenantNode> {
  const { data } = await httpClient.put<ApiEnvelope<TenantNode>>(`/tenant-nodes/${id}`, payload)
  return data.data!
}

export async function moveTenantNode(id: number, payload: MoveTenantNodeRequest): Promise<TenantNode> {
  const { data } = await httpClient.put<ApiEnvelope<TenantNode>>(`/tenant-nodes/${id}/move`, payload)
  return data.data!
}

export async function deleteTenantNode(id: number): Promise<void> {
  await httpClient.delete(`/tenant-nodes/${id}`)
}

export async function updateTenantNodeStatus(
  id: number,
  payload: UpdateTenantNodeStatusRequest
): Promise<TenantNode> {
  const { data } = await httpClient.put<ApiEnvelope<TenantNode>>(`/tenant-nodes/${id}/status`, payload)
  return data.data!
}
