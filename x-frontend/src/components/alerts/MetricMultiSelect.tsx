import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ignoreOwnLabelOutside } from '@/lib/popoverLabel'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/metric'

/** Trên ngưỡng này mới hiện ô tìm — ít mục thì mắt quét nhanh hơn gõ. */
const SEARCH_THRESHOLD = 8

export function MetricMultiSelect({
  id,
  metrics,
  value,
  onChange,
  invalid,
}: {
  id?: string
  metrics: Metric[]
  value: number[]
  onChange: (ids: number[]) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return metrics
    return metrics.filter(
      (metric) =>
        metric.name.toLowerCase().includes(needle) || metric.code.toLowerCase().includes(needle)
    )
  }, [metrics, query])

  const selected = new Set(value)
  const summary = metrics
    .filter((metric) => selected.has(metric.id))
    .map((metric) => metric.name)
    .join(', ')

  function toggle(metricId: number) {
    const next = new Set(value)
    if (next.has(metricId)) next.delete(metricId)
    else next.add(metricId)
    onChange([...next])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Khớp hẳn kiểu SelectTrigger như TenantNodePicker đã làm, để hai ô đứng cạnh nhau
            không lệch viền/nền. */}
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          className={cn(
            'h-9 w-full justify-between border-input bg-field font-normal dark:bg-field',
            !summary && 'text-muted-foreground'
          )}
        >
          <span className="min-w-0 truncate">{summary || 'Chọn chỉ số'}</span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        // Khoá hẳn xuống dưới: mỗi lần tick một chỉ số là danh sách bên dưới dài thêm, ô trigger
        // tụt xuống và Radix lật popover lên trên — nội dung nhảy ngay dưới con trỏ.
        avoidCollisions={false}
        // Nhãn phía trên trỏ vào nút này — bấm nhãn khi đang mở phải ĐÓNG, không được mở lại.
        onInteractOutside={ignoreOwnLabelOutside(id)}
        className="flex max-h-56 w-(--radix-popover-trigger-width) flex-col overflow-hidden p-0"
      >
        {metrics.length > SEARCH_THRESHOLD && (
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm chỉ số"
              aria-label="Tìm chỉ số"
              className="h-8"
            />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
            {visible.map((metric) => {
              const isSelected = selected.has(metric.id)
              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => toggle(metric.id)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                  <span className="flex-1 truncate">{metric.name}</span>
                  <span className="text-[12.5px] text-muted-foreground">{metric.unit}</span>
                  {isSelected && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
            {visible.length === 0 && (
              <p className="px-2 py-6 text-center text-[12.5px] text-muted-foreground">
                Không có chỉ số nào khớp.
              </p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
