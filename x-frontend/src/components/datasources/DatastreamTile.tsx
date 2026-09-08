import { Plus } from 'lucide-react'
import { formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { Datastream } from '@/types/dashboard'
import type { DatastreamTelemetry } from '@/types/externalSource'

/** Quá 3 nhịp đọc mà không có số mới thì kênh coi như đứng, dù truy vấn vẫn báo SUCCESS. */
function staleness(latestMeasuredAt: string | null | undefined) {
  if (!latestMeasuredAt) return 'never' as const
  const minutes = (Date.now() - new Date(latestMeasuredAt).getTime()) / 60_000
  if (minutes > 180) return 'stale' as const
  if (minutes > 30) return 'slow' as const
  return 'fresh' as const
}

/**
 * Một kênh trên pipeline: chỉ số mới nhất, không có biểu đồ.
 *
 * Biểu đồ nằm trong modal chi tiết chứ không ở đây — sparkline 64px cạnh nhau hàng loạt thì
 * không đọc được xu hướng nào mà lại ăn hết chiều cao, khiến hàng kênh cao ngang khối truy vấn
 * và cả pipeline mất nhịp. Thẻ này trả lời đúng một câu: "giá trị hiện tại là bao nhiêu, có mới
 * không". Muốn biết nó đi lên hay xuống thì bấm vào.
 */
export function DatastreamTile({
  datastream,
  telemetry,
  onSelect,
}: {
  datastream: Datastream
  /** Thiếu khi kênh vừa tạo và InfluxDB chưa có điểm nào. */
  telemetry: DatastreamTelemetry | null
  onSelect: () => void
}) {
  const state = staleness(telemetry?.latestMeasuredAt)
  const hasValue = telemetry?.latestValue !== null && telemetry?.latestValue !== undefined

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-32 w-56 flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 text-left transition-[color,background-color,border-color,box-shadow,translate] duration-[--motion-fast] ease-[--motion-ease] hover:border-primary/50 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{datastream.name}</span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {datastream.metricCode ?? '—'}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'tabular text-[32px] leading-none font-semibold tracking-tight',
            !hasValue && 'text-muted-foreground'
          )}
        >
          {hasValue ? telemetry?.latestValue : '—'}
        </span>
        {datastream.metricUnit && (
          <span className="text-sm text-muted-foreground">{datastream.metricUnit}</span>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border/70 pt-2.5">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {datastream.sourceField}
        </span>
        <span
          className={cn(
            'shrink-0 text-[11px] text-muted-foreground',
            state === 'slow' && 'text-warning',
            state === 'stale' && 'text-critical'
          )}
        >
          {state === 'never' ? 'chưa có số đo' : formatRelativeTime(telemetry?.latestMeasuredAt ?? null)}
        </span>
      </div>
    </button>
  )
}

/** Ô cuối hàng kênh: chỗ trống trong pipeline chính là lời mời lấp nó. */
export function AddChannelTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-32 w-40 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors duration-[--motion-fast] ease-[--motion-ease] hover:border-primary/60 hover:bg-primary/5 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Plus className="size-4" />
      <span className="text-[12.5px]">Thêm kênh</span>
    </button>
  )
}
