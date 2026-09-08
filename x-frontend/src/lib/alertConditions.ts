import type { AlertConditionGroup } from '@/types/alert'

/**
 * Diễn giải nhóm điều kiện thành một dòng đọc được. Phép nối in ra bằng chữ ("hoặc" / "và") chứ
 * không phải dấu phẩy — dấu phẩy đọc ra như "và" và người đọc sẽ hiểu ngược logic của nhóm OR.
 */
export function formatConditions(group: AlertConditionGroup | null | undefined, unit?: string | null) {
  const conditions = group?.conditions ?? []
  if (!conditions.length) return '—'
  const suffix = unit ? ` ${unit}` : ''
  const joiner = group?.logic === 'AND' ? ' và ' : ' hoặc '
  return conditions.map((condition) => `${condition.operator} ${condition.threshold}${suffix}`).join(joiner)
}

/** 0 giây = bắn ngay lần vi phạm đầu, không phải "trong 0 giây". */
export function formatDuration(seconds: number) {
  if (!seconds) return 'Ngay lập tức'
  if (seconds < 60) return `Vi phạm liên tục ${seconds} giây`
  if (seconds % 3600 === 0) return `Vi phạm liên tục ${seconds / 3600} giờ`
  if (seconds % 60 === 0) return `Vi phạm liên tục ${seconds / 60} phút`
  return `Vi phạm liên tục ${seconds} giây`
}
