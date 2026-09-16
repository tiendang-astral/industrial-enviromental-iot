import { Check } from 'lucide-react'
import { colorTokenVar } from '@/lib/metricColors'
import { cn } from '@/lib/utils'
import { METRIC_COLORS, type MetricColor } from '@/types/metric'

const COLOR_LABEL: Record<MetricColor, string> = {
  'chart-1': 'Lam',
  'chart-2': 'Tím',
  'chart-3': 'Hồng',
  'chart-4': 'Cam',
  'chart-5': 'Vàng',
  'chart-6': 'Lục',
  neutral: 'Trung tính',
}

/**
 * Bảng màu do hệ thống cấp, không cho nhập mã màu tự do: token dự án khai bằng `oklch()` và có bản
 * riêng cho light lẫn dark, còn một mã màu cố định sẽ chìm ở một trong hai theme.
 */
export function MetricColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: MetricColor | null
  onChange: (color: MetricColor) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {METRIC_COLORS.map((color) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              'flex size-8 items-center justify-center rounded-md border transition-colors',
              'duration-(--motion-fast) ease-(--motion-ease)',
              selected ? 'border-ring ring-2 ring-ring/40' : 'border-border hover:border-ring/60',
              disabled && 'pointer-events-none opacity-50'
            )}
            style={{ backgroundColor: `color-mix(in oklab, ${colorTokenVar(color)} 22%, transparent)` }}
          >
            <span
              className="flex size-4 items-center justify-center rounded-full"
              style={{ backgroundColor: colorTokenVar(color) }}
            >
              {selected && <Check className="size-3 text-background" />}
            </span>
            <span className="sr-only">{COLOR_LABEL[color]}</span>
          </button>
        )
      })}
    </div>
  )
}
