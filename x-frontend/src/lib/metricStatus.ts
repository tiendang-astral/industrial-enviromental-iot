export type MetricStatus = 'ok' | 'warning' | 'critical'

const WARNING_BAND_RATIO = 0.1

/**
 * "critical" khi giá trị vượt hẳn ra ngoài [minValue, maxValue] của Metric; "warning" khi lọt vào
 * 10% biên gần ngưỡng (cảnh báo sớm trước khi thật sự vượt); "ok" các trường hợp còn lại — kể cả
 * khi metric không khai báo minValue/maxValue (nhiều metric để trống, không thể đánh giá).
 */
export interface MetricThreshold {
  status: MetricStatus
  /** Ngưỡng đang bị áp sát hoặc đã vượt. NULL khi `status = 'ok'`. */
  bound: 'upper' | 'lower' | null
  /** Giá trị của chính ngưỡng đó — để giao diện nói "23.4 / 25" thay vì "gần ngưỡng" chung chung. */
  limit: number | null
}

const OK: MetricThreshold = { status: 'ok', bound: null, limit: null }

export function getMetricThreshold(
  value: number | null | undefined,
  minValue: number | null | undefined,
  maxValue: number | null | undefined
): MetricThreshold {
  if (value == null || minValue == null || maxValue == null) return OK
  if (value > maxValue) return { status: 'critical', bound: 'upper', limit: maxValue }
  if (value < minValue) return { status: 'critical', bound: 'lower', limit: minValue }

  const range = maxValue - minValue
  if (range <= 0) return OK

  const warnBand = range * WARNING_BAND_RATIO
  if (value > maxValue - warnBand) return { status: 'warning', bound: 'upper', limit: maxValue }
  if (value < minValue + warnBand) return { status: 'warning', bound: 'lower', limit: minValue }
  return OK
}

/** Giữ lại cho nơi chỉ cần mức độ, không cần biết chạm ngưỡng nào. */
export function getMetricStatus(
  value: number | null | undefined,
  minValue: number | null | undefined,
  maxValue: number | null | undefined
): MetricStatus {
  return getMetricThreshold(value, minValue, maxValue).status
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
