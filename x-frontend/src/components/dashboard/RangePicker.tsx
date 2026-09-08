import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TELEMETRY_RANGES } from '@/lib/telemetryRanges'
import { cn } from '@/lib/utils'

interface RangePickerProps {
  value: number
  onChange: (rangeMinutes: number) => void
  /**
   * `select` cho widget trên board — chỗ hẹp nhất chỉ 4/12 cột, bốn nút cạnh nhau sẽ đẩy tên kênh
   * xuống còn vài ký tự. `group` cho khung xem lớn — ở đó thừa chỗ, và thấy hết lựa chọn cùng lúc
   * thì đổi khoảng chỉ tốn một cú bấm thay vì hai.
   */
  variant?: 'select' | 'group'
  className?: string
}

/** Ô chọn khoảng thời gian dùng chung cho widget biểu đồ và khung xem lớn. */
export function RangePicker({ value, onChange, variant = 'select', className }: RangePickerProps) {
  if (variant === 'group') {
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={String(value)}
        // Radix trả chuỗi rỗng khi bấm lại chính mục đang chọn — bỏ qua để không rơi về "chưa chọn".
        onValueChange={(next) => next && onChange(Number(next))}
        className={cn('shrink-0', className)}
      >
        {TELEMETRY_RANGES.map((range) => (
          <ToggleGroupItem key={range.minutes} value={String(range.minutes)} aria-label={range.label}>
            {range.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    )
  }

  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger size="sm" className={cn('w-auto shrink-0', className)} aria-label="Khoảng thời gian">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TELEMETRY_RANGES.map((range) => (
          <SelectItem key={range.minutes} value={String(range.minutes)}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
