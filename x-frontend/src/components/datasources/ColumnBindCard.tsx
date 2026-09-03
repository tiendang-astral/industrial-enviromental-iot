import { Clock, Link2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { suggestMetricCode } from '@/lib/sqlTemplate'
import { cn } from '@/lib/utils'
import type { Datastream } from '@/types/dashboard'
import type { Metric } from '@/types/metric'
import type { PreviewColumn, PreviewResult } from '@/types/externalSource'

/** Sparkline vẽ thẳng từ dữ liệu chạy thử — không gọi thêm API, chỉ để thấy cột có biến thiên. */
function Sparkline({ values, muted }: { values: number[]; muted?: boolean }) {
  if (values.length < 2) return <div className="h-7" />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 24 - ((value - min) / span) * 20
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        className={muted ? 'stroke-muted-foreground' : 'stroke-primary'}
        strokeDasharray={muted ? '3 3' : undefined}
      />
    </svg>
  )
}

export function ColumnBindCard({
  column,
  preview,
  columnIndex,
  isTimestamp,
  datastream,
  metrics,
  onBind,
  onUnbind,
}: {
  column: PreviewColumn
  preview: PreviewResult
  columnIndex: number
  isTimestamp: boolean
  datastream: Datastream | null
  metrics: Metric[]
  onBind: (column: PreviewColumn) => void
  onUnbind: (datastream: Datastream) => void
}) {
  const values = column.numeric
    ? preview.rows
        .map((row) => row[columnIndex])
        .filter((value): value is number => typeof value === 'number')
    : []

  if (isTimestamp) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[12.5px]">{column.name}</span>
          <Badge variant="outline" className="shrink-0 gap-1">
            <Clock className="size-3" />
            mốc thời gian
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Cột này định vị thời điểm và nuôi <span className="font-mono">:cursor</span>. Không gán metric.
        </p>
      </div>
    )
  }

  const metric = datastream ? metrics.find((item) => item.id === datastream.metricId) : null
  const suggestedCode = !datastream ? suggestMetricCode(column.name) : null
  const suggested = suggestedCode ? metrics.find((item) => item.code === suggestedCode) : null

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-md border p-3',
        datastream ? 'border-border bg-muted/30' : 'border-dashed border-border'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[12.5px]">{column.name}</span>
        <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{column.dataType}</span>
      </div>

      <Sparkline values={values} muted={!datastream} />

      {datastream ? (
        <>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
            <span className="truncate text-[12.5px]">{metric?.name ?? `Metric #${datastream.metricId}`}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{metric?.unit}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11.5px] text-muted-foreground">Kênh: {datastream.name}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onUnbind(datastream)}
                >
                  <Trash2 />
                  <span className="sr-only">Bỏ gán kênh {datastream.name}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bỏ gán kênh</TooltipContent>
            </Tooltip>
          </div>
        </>
      ) : (
        <>
          {suggested && (
            <p className="text-[11.5px] text-primary">
              Gợi ý: {suggested.name} ({suggested.unit})
            </p>
          )}
          <Button variant="outline" size="sm" className="w-fit" onClick={() => onBind(column)}>
            <Link2 data-icon="inline-start" />
            Gán metric
          </Button>
        </>
      )}
    </div>
  )
}
