import { AlertTriangle, Radio } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/EmptyState'
import { TrendChart } from '@/components/patterns/TrendChart'
import { formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { DatastreamTelemetry } from '@/types/externalSource'

const RANGE_MINUTES = 720

/** Quá 3 nhịp đọc mà không có số mới thì kênh coi như đứng, dù job vẫn báo SUCCESS. */
function staleness(latestMeasuredAt: string | null) {
  if (!latestMeasuredAt) return 'never' as const
  const minutes = (Date.now() - new Date(latestMeasuredAt).getTime()) / 60_000
  if (minutes > 180) return 'stale' as const
  if (minutes > 30) return 'slow' as const
  return 'fresh' as const
}

function Tile({ item, now }: { item: DatastreamTelemetry; now: number }) {
  const state = staleness(item.latestMeasuredAt)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{item.sourceField}</p>
        </div>
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
          {item.metricCode ?? '—'}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'tabular text-3xl font-semibold tracking-tight',
            state === 'stale' && 'text-muted-foreground',
            state === 'never' && 'text-muted-foreground'
          )}
        >
          {item.latestValue ?? '—'}
        </span>
        {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
      </div>

      <div className="flex h-16">
        <TrendChart
          history={item.history}
          variant="sparkline"
          rangeMinutes={RANGE_MINUTES}
          now={now}
        />
      </div>

      <p
        className={cn(
          'text-[11.5px] text-muted-foreground',
          state === 'slow' && 'text-warning',
          state === 'stale' && 'text-critical'
        )}
      >
        {state === 'never' ? 'chưa có số đo nào' : `cập nhật ${formatRelativeTime(item.latestMeasuredAt)}`}
      </p>
    </div>
  )
}

export function DatastreamTileGrid({
  telemetry,
  isLoading,
  error,
  empty,
}: {
  telemetry: DatastreamTelemetry[]
  isLoading: boolean
  error?: unknown
  /** Ghi đè trạng thái rỗng — nhóm theo job cần nói rõ job nào chưa có kênh. */
  empty?: React.ReactNode
}) {
  // Mốc "bây giờ" chốt một lần cho cả lưới — mỗi thẻ tự gọi Date.now() sẽ lệch trục giữa các thẻ.
  const now = Date.now()

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Không đọc được số đo đã lưu</AlertTitle>
        <AlertDescription>
          Kênh dữ liệu vẫn còn nguyên, chỉ là không lấy được lịch sử từ InfluxDB lúc này.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[196px] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (telemetry.length === 0) {
    return (
      empty ?? (
        <EmptyState
          icon={Radio}
          title="Chưa có kênh dữ liệu nào"
          description="Mở một job rồi tạo kênh từ cột cần theo dõi."
        />
      )
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {telemetry.map((item) => (
        <Tile key={item.datastreamId} item={item} now={now} />
      ))}
    </div>
  )
}
