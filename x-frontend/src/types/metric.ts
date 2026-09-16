/** Bảy token màu hệ thống cấp sẵn — đều đã khai cả bản light lẫn dark trong index.css. */
export const METRIC_COLORS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'neutral',
] as const

export type MetricColor = (typeof METRIC_COLORS)[number]

export interface Metric {
  id: number
  code: string
  name: string
  unit: string
  dataType: 'NUMBER' | 'BOOLEAN' | 'STRING'
  /** Chỉ chỉ số riêng mới có; chỉ số hệ thống để null và màu tra theo `code` ở lib/metricColors.ts. */
  color: MetricColor | null
  /** Ngưỡng ĐÃ áp theo tenant. null = chưa đặt, giao diện không tô màu trạng thái. */
  minValue: number | null
  maxValue: number | null
  /** true = do tenant tự thêm, sửa/xoá được. */
  custom: boolean
  /** true = đã đặt ngưỡng riêng, khôi phục mặc định được. */
  thresholdOverridden: boolean
}

export interface CreateMetricRequest {
  code: string
  name: string
  unit: string
  color: MetricColor
  minValue: number | null
  maxValue: number | null
}

export interface UpdateMetricRequest {
  name: string
  unit: string
  color: MetricColor
}

export interface UpdateMetricThresholdRequest {
  minValue: number
  maxValue: number
}
