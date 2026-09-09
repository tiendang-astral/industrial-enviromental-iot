import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { EnvironmentReport, IncidentReport, ReportFilter } from '@/types/report'

// `filter.scope` cố tình KHÔNG gửi lên: nó chỉ nói cho FE biết gom nhóm biểu đồ theo chiều
// nào, còn phạm vi thật đã nằm trong ba danh sách id bên dưới.

/** Spring tự tách chuỗi ngăn bằng dấu phẩy thành List<Long>; kiểu `ids[]=` của axios thì không. */
function csv(ids: number[]) {
  return ids.length ? ids.join(',') : undefined
}

export async function getEnvironmentReport(filter: ReportFilter): Promise<EnvironmentReport> {
  const { data } = await httpClient.get<ApiEnvelope<EnvironmentReport>>('/reports/environment', {
    params: {
      from: filter.from,
      to: filter.to,
      tenantNodeIds: csv(filter.tenantNodeIds),
      metricIds: csv(filter.metricIds),
      gatewayIds: csv(filter.gatewayIds),
      externalSourceIds: csv(filter.externalSourceIds),
    },
  })
  return data.data!
}

export async function getIncidentReport(filter: ReportFilter): Promise<IncidentReport> {
  const { data } = await httpClient.get<ApiEnvelope<IncidentReport>>('/reports/incident', {
    params: {
      from: filter.from,
      to: filter.to,
      tenantNodeIds: csv(filter.tenantNodeIds),
      gatewayIds: csv(filter.gatewayIds),
      externalSourceIds: csv(filter.externalSourceIds),
      metricIds: csv(filter.metricIds),
    },
  })
  return data.data!
}
