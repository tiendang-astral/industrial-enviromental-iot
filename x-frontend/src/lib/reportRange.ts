import type { DateRange } from 'react-day-picker'
import type { RangePreset } from '@/components/patterns/DateRangePicker'

/** Trần khớp `MAX_RANGE_DAYS` ở x-backend — chặn ngay trên form thay vì để backend trả 400. */
export const MAX_REPORT_DAYS = 366

const DAY_MS = 86400_000

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS)
}

export const RANGE_PRESETS: RangePreset[] = [
  { label: '7 ngày qua', range: () => ({ from: daysAgo(6), to: new Date() }) },
  { label: '30 ngày qua', range: () => ({ from: daysAgo(29), to: new Date() }) },
  {
    label: 'Tháng này',
    range: () => {
      const now = new Date()
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    },
  },
  {
    label: 'Tháng trước',
    range: () => {
      const now = new Date()
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    },
  },
]

export function defaultRange(): DateRange {
  return { from: daysAgo(6), to: new Date() }
}

/**
 * Khoảng ngày → cặp mốc thời gian gửi lên API. Ngày cuối lấy trọn tới 23:59:59.999 chứ không phải
 * 00:00 của chính nó: chọn "1/9 - 8/9" mà cắt ở 00:00 ngày 8 là mất nguyên ngày cuối, và không có gì
 * trên giao diện nói cho người dùng biết điều đó.
 */
export function rangeToInstants(range: DateRange | undefined): { from: string; to: string } | null {
  if (!range?.from) return null
  const start = new Date(range.from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(range.to ?? range.from)
  end.setHours(23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString() }
}

/** null = hợp lệ; ngược lại là câu giải thích hiện ngay dưới ô, không đợi backend. */
export function validateRange(range: DateRange | undefined): string | null {
  const instants = rangeToInstants(range)
  if (!instants) return 'Chọn khoảng ngày cho báo cáo'
  const span = new Date(instants.to).getTime() - new Date(instants.from).getTime()
  if (span > MAX_REPORT_DAYS * DAY_MS) return `Khoảng báo cáo tối đa ${MAX_REPORT_DAYS} ngày`
  return null
}

/** Số đo gộp mẫu: in kèm bề rộng cửa sổ để không ai đọc nhầm là điểm thô. */
export function formatBucket(bucketSeconds: number) {
  if (bucketSeconds < 60) return `${bucketSeconds} giây`
  if (bucketSeconds < 3600) return `${Math.round(bucketSeconds / 60)} phút`
  return `${Math.round(bucketSeconds / 3600)} giờ`
}

export function formatIncidentDuration(seconds: number | null) {
  if (seconds === null) return null
  if (seconds < 60) return `${seconds} giây`
  if (seconds < 3600) return `${Math.round(seconds / 60)} phút`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} giờ`
  return `${(seconds / 86400).toFixed(1)} ngày`
}

/** Giá trị đo: 1 chữ số thập phân là đủ đọc, số nguyên thì bỏ phần lẻ cho bảng bớt nhiễu. */
export function formatMeasure(value: number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined) return '—'
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit ? `${rounded} ${unit}` : rounded
}
