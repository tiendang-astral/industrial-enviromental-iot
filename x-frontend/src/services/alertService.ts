import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  Alert,
  AlertRule,
  AlertRuleGroup,
  CreateAlertRuleRequest,
  SaveAlertRuleGroupRequest,
  UpdateAlertRuleRequest,
} from '@/types/alert'

export async function listAlertRules(tenantNodeId?: number, includeDescendants = false): Promise<AlertRule[]> {
  const { data } = await httpClient.get<ApiEnvelope<AlertRule[]>>('/alert-rules', {
    params: tenantNodeId ? { tenantNodeId, includeDescendants } : undefined,
  })
  return data.data!
}

export async function createAlertRule(payload: CreateAlertRuleRequest): Promise<AlertRule> {
  const { data } = await httpClient.post<ApiEnvelope<AlertRule>>('/alert-rules', payload)
  return data.data!
}

export async function updateAlertRule(id: number, payload: UpdateAlertRuleRequest): Promise<AlertRule> {
  const { data } = await httpClient.put<ApiEnvelope<AlertRule>>(`/alert-rules/${id}`, payload)
  return data.data!
}

export async function updateAlertRuleStatus(id: number, enabled: boolean): Promise<AlertRule> {
  const { data } = await httpClient.put<ApiEnvelope<AlertRule>>(`/alert-rules/${id}/status`, { enabled })
  return data.data!
}

export async function deleteAlertRule(id: number): Promise<void> {
  await httpClient.delete(`/alert-rules/${id}`)
}

/**
 * Không lọc theo khoảng thời gian nữa — lấy N cảnh báo mới nhất, phân trang ở client như mọi bảng
 * khác. `status` vẫn giữ cho widget Dashboard chỉ cần alert đang mở; trang Cảnh báo bỏ trống nó và
 * lọc bằng ô lọc ngay trên cột.
 */
export async function listAlerts(status?: string, tenantNodeId?: number, limit = 500): Promise<Alert[]> {
  const { data } = await httpClient.get<ApiEnvelope<Alert[]>>('/alerts', {
    params: { status, tenantNodeId, limit },
  })
  return data.data!
}

export async function listAlertRuleGroups(): Promise<AlertRuleGroup[]> {
  const { data } = await httpClient.get<ApiEnvelope<AlertRuleGroup[]>>('/alert-rule-groups')
  return data.data!
}

export async function createAlertRuleGroup(payload: SaveAlertRuleGroupRequest): Promise<AlertRuleGroup> {
  const { data } = await httpClient.post<ApiEnvelope<AlertRuleGroup>>('/alert-rule-groups', payload)
  return data.data!
}

export async function updateAlertRuleGroup(
  id: number,
  payload: SaveAlertRuleGroupRequest
): Promise<AlertRuleGroup> {
  const { data } = await httpClient.put<ApiEnvelope<AlertRuleGroup>>(`/alert-rule-groups/${id}`, payload)
  return data.data!
}

export async function updateAlertRuleGroupStatus(id: number, enabled: boolean): Promise<AlertRuleGroup> {
  const { data } = await httpClient.put<ApiEnvelope<AlertRuleGroup>>(`/alert-rule-groups/${id}/status`, { enabled })
  return data.data!
}

export async function deleteAlertRuleGroup(id: number): Promise<void> {
  await httpClient.delete(`/alert-rule-groups/${id}`)
}
