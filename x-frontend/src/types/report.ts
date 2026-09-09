import type { AlertConditionGroup, AlertSeverity, AlertStatus } from '@/types/alert'
import type { ReadingPoint } from '@/types/telemetry'

export type ReportKind = 'environment' | 'incident'

/** Chiều thu hẹp phạm vi ở thanh lọc. */
export type ReportScope = 'source' | 'gateway' | 'metric'

/**
 * Chiều gom nhóm phần biểu đồ + thống kê cảnh báo. Bằng `ReportScope` đang chọn; chưa chọn chiều
 * nào thì gom theo đơn vị — báo cáo luôn có đơn vị, còn gateway/nguồn/chỉ số thì không chắc.
 */
export type ReportGroupBy = 'node' | ReportScope

export interface EnvironmentChannel {
  datastreamId: number
  datastreamName: string
  tenantNodeId: number
  tenantNodeName: string | null
  metricCode: string | null
  metricName: string | null
  metricUnit: string | null
  sourceType: 'GATEWAY_PIN' | 'EXTERNAL_SOURCE_JOB'
  gatewayId: number | null
  gatewayName: string | null
  externalSourceId: number | null
  externalSourceName: string | null
  sampleCount: number
  minValue: number | null
  maxValue: number | null
  avgValue: number | null
  /** Đếm từ bảng alert — khoảng trước khi quy tắc được tạo luôn là 0, không phải "không vi phạm". */
  alertCount: number
  history: ReadingPoint[]
}

export interface EnvironmentReport {
  from: string
  to: string
  generatedAt: string
  bucketSeconds: number
  channels: EnvironmentChannel[]
}

export interface Incident {
  id: number
  ruleId: number
  ruleName: string | null
  tenantNodeId: number
  tenantNodeName: string | null
  datastreamId: number | null
  datastreamName: string | null
  metricCode: string | null
  metricName: string | null
  metricUnit: string | null
  severity: AlertSeverity
  status: AlertStatus
  thresholdSnapshot: AlertConditionGroup | null
  lastObservedValue: number | null
  startedAt: string
  triggeredAt: string | null
  recoveredAt: string | null
  /** null = chưa kết thúc (còn mở, hoặc bỏ dở vì quy tắc bị tắt). */
  durationSeconds: number | null
}

export interface IncidentCount {
  label: string
  total: number
  critical: number
  warning: number
}

export interface IncidentReport {
  from: string
  to: string
  generatedAt: string
  totalCount: number
  incidents: Incident[]
  byNode: IncidentCount[]
  byMetric: IncidentCount[]
}

/** Bộ lọc đã bấm "Tạo báo cáo" — query chỉ chạy khi có giá trị này, không tự chạy lúc mở trang. */
export interface ReportFilter {
  from: string
  to: string
  tenantNodeIds: number[]
  /** Chỉ dùng ở client (gom nhóm biểu đồ) — không gửi lên API. */
  scope: ReportScope | null
  metricIds: number[]
  /** Hợp nhau chứ không giao: một kênh chỉ thuộc gateway HOẶC thuộc nguồn ngoài. */
  gatewayIds: number[]
  externalSourceIds: number[]
}
