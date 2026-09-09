import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/datetime'
import { cn } from '@/lib/utils'

export interface RangePreset {
  label: string
  range: () => DateRange
}

/**
 * Ô chọn khoảng ngày dùng lịch, kèm cột phím tắt.
 *
 * Chọn theo NGÀY chứ không theo giờ-phút: báo cáo luôn tính trọn ngày, mà bắt người dùng gõ hai mốc
 * `datetime-local` thì họ phải tự canh 00:00 và 23:59 mới không hụt mất nửa ngày cuối. Việc quy ra
 * mốc thời gian đầy đủ do nơi gọi làm (xem `rangeToInstants`).
 */
export function DateRangePicker({
  id,
  value,
  onChange,
  presets = [],
  invalid,
  className,
}: {
  id?: string
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  presets?: RangePreset[]
  invalid?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const label = value?.from
    ? value.to
      ? `${formatDate(value.from.toISOString())} - ${formatDate(value.to.toISOString())}`
      : formatDate(value.from.toISOString())
    : 'Chọn khoảng ngày'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={invalid}
          className={cn('w-full justify-start font-normal', !value?.from && 'text-muted-foreground', className)}
        >
          <CalendarDays data-icon="inline-start" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-0 p-0" align="start">
        {presets.length > 0 && (
          <>
            <div className="flex w-40 flex-col gap-1 p-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => {
                    onChange(preset.range())
                    setOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-auto" />
          </>
        )}
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          disabled={{ after: new Date() }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
