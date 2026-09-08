import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TELEMETRY_RANGES } from '@/lib/telemetryRanges'

export function TelemetryRangePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (rangeMinutes: number) => void
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      spacing={0}
      value={String(value)}
      // Radix bắn chuỗi rỗng khi người dùng bấm lại nút đang chọn — bỏ qua để luôn còn 1 khoảng.
      onValueChange={(next) => next && onChange(Number(next))}
      aria-label="Khoảng thời gian"
    >
      {TELEMETRY_RANGES.map((range) => (
        <ToggleGroupItem key={range.minutes} value={String(range.minutes)}>
          {range.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
