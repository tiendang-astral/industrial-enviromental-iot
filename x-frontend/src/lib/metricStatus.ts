export type MetricStatus = 'ok' | 'warning' | 'critical'

const WARNING_BAND_RATIO = 0.1

/**
 * "critical" khi giá trị vượt hẳn ra ngoài [minValue, maxValue] của Metric; "warning" khi lọt vào
 * 10% biên gần ngưỡng (cảnh báo sớm trước khi thật sự vượt); "ok" các trường hợp còn lại — kể cả
 * khi metric không khai báo minValue/maxValue (nhiều metric để trống, không thể đánh giá).
 */
export function getMetricStatus(
  value: number | null | undefined,
  minValue: number | null | undefined,
  maxValue: number | null | undefined
): MetricStatus {
  if (value == null || minValue == null || maxValue == null) return 'ok'
  if (value < minValue || value > maxValue) return 'critical'

  const range = maxValue - minValue
  if (range <= 0) return 'ok'

  const warnBand = range * WARNING_BAND_RATIO
  if (value < minValue + warnBand || value > maxValue - warnBand) return 'warning'
  return 'ok'
}

export const METRIC_STATUS_VALUE_CLASS: Record<MetricStatus, string> = {
  ok: '',
  warning: 'text-warning',
  critical: 'text-critical',
}

/** Badge component không có variant "critical" riêng — dùng chung "destructive" (cùng màu --destructive). */
export const METRIC_STATUS_BADGE_VARIANT: Record<MetricStatus, 'ok' | 'warning' | 'destructive'> = {
  ok: 'ok',
  warning: 'warning',
  critical: 'destructive',
}
