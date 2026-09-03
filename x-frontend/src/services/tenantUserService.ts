import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  CreateTenantUserRequest,
  ResetTenantUserPasswordRequest,
  TenantRole,
  TenantUser,
  UpdateTenantUserRequest,
  UpdateTenantUserStatusRequest,
} from '@/types/tenantUser'

export async function listTenantUsers(): Promise<TenantUser[]> {
  const { data } = await httpClient.get<ApiEnvelope<TenantUser[]>>('/tenant-users')
  return data.data!
}

export async function createTenantUser(payload: CreateTenantUserRequest): Promise<TenantUser> {
  const { data } = await httpClient.post<ApiEnvelope<TenantUser>>('/tenant-users', payload)
  return data.data!
}

export async function updateTenantUser(
  id: number,
  payload: UpdateTenantUserRequest
): Promise<TenantUser> {
  const { data } = await httpClient.put<ApiEnvelope<TenantUser>>(`/tenant-users/${id}`, payload)
  return data.data!
}

export async function updateTenantUserStatus(
  id: number,
  payload: UpdateTenantUserStatusRequest
): Promise<TenantUser> {
  const { data } = await httpClient.put<ApiEnvelope<TenantUser>>(`/tenant-users/${id}/status`, payload)
  return data.data!
}

export async function resetTenantUserPassword(
  id: number,
  payload: ResetTenantUserPasswordRequest
): Promise<void> {
  await httpClient.put(`/tenant-users/${id}/password`, payload)
}

export async function deleteTenantUser(id: number): Promise<void> {
  await httpClient.delete(`/tenant-users/${id}`)
}

export async function listTenantRoles(): Promise<TenantRole[]> {
  const { data } = await httpClient.get<ApiEnvelope<TenantRole[]>>('/tenant-roles')
  return data.data!
}
