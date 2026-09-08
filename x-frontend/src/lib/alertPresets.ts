import type { AlertConditionGroup } from '@/types/alert'

export type ConditionPreset = 'GT' | 'LT' | 'OUTSIDE' | 'INSIDE'

export const CONDITION_PRESETS: { value: ConditionPreset; label: string; hint: string }[] = [
  { value: 'GT', label: 'Lớn hơn', hint: 'Cảnh báo khi vượt lên trên ngưỡng' },
  { value: 'LT', label: 'Nhỏ hơn', hint: 'Cảnh báo khi tụt xuống dưới ngưỡng' },
  { value: 'OUTSIDE', label: 'Ngoài khoảng', hint: 'Cảnh báo khi ra khỏi khoảng an toàn' },
  { value: 'INSIDE', label: 'Trong khoảng', hint: 'Cảnh báo khi rơi vào khoảng này' },
]

export function needsTwoThresholds(preset: ConditionPreset) {
  return preset === 'OUTSIDE' || preset === 'INSIDE'
}

/**
 * Preset → `conditions_json`. "Trong khoảng" là phép AND — đây là lý do engine phải hiểu `logic`
 * chứ không chỉ OR như bản đầu.
 */
export function presetToConditions(preset: ConditionPreset, low: number, high: number): AlertConditionGroup {
  switch (preset) {
    case 'GT':
      return { logic: 'OR', conditions: [{ operator: '>', threshold: low }] }
    case 'LT':
      return { logic: 'OR', conditions: [{ operator: '<', threshold: low }] }
    case 'OUTSIDE':
      return { logic: 'OR', conditions: [{ operator: '<', threshold: low }, { operator: '>', threshold: high }] }
    case 'INSIDE':
      return { logic: 'AND', conditions: [{ operator: '>=', threshold: low }, { operator: '<=', threshold: high }] }
  }
}

/**
 * Suy ngược preset từ dữ liệu đã lưu — nhờ vậy không phải thêm cột `preset` vào DB, và rule sửa
 * tay trong DB vẫn mở lại được form (rơi về 'GT' kèm ngưỡng đầu tiên).
 */
export function conditionsToPreset(group: AlertConditionGroup | null | undefined): {
  preset: ConditionPreset
  low: number
  high: number
} {
  const conditions = group?.conditions ?? []
  const first = conditions[0]
  const second = conditions[1]

  if (conditions.length >= 2) {
    if (group?.logic === 'AND') {
      return { preset: 'INSIDE', low: first?.threshold ?? 0, high: second?.threshold ?? 0 }
    }
    return { preset: 'OUTSIDE', low: first?.threshold ?? 0, high: second?.threshold ?? 0 }
  }
  if (first?.operator === '<' || first?.operator === '<=') {
    return { preset: 'LT', low: first.threshold, high: 0 }
  }
  return { preset: 'GT', low: first?.threshold ?? 0, high: 0 }
}

export const DURATION_UNITS: { value: number; label: string }[] = [
  { value: 1, label: 'giây' },
  { value: 60, label: 'phút' },
  { value: 3600, label: 'giờ' },
]

/** Chọn đơn vị lớn nhất chia hết — 300s mở lại thành "5 phút", không phải "300 giây". */
export function splitDuration(seconds: number): { amount: number; unit: number } {
  for (const unit of [3600, 60]) {
    if (seconds > 0 && seconds % unit === 0) {
      return { amount: seconds / unit, unit }
    }
  }
  return { amount: seconds, unit: 1 }
}

/** Nhãn cho `alert_rule.source_type` — null = không giới hạn. */
export const SOURCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Mọi nguồn' },
  { value: 'GATEWAY_PIN', label: 'Cảm biến gateway' },
  { value: 'EXTERNAL_SOURCE_JOB', label: 'Database ngoài' },
]

export function sourceTypeLabel(sourceType: string | null) {
  return SOURCE_TYPE_OPTIONS.find((option) => option.value === (sourceType ?? 'ALL'))?.label ?? 'Mọi nguồn'
}
