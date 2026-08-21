import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buildSparklineOption } from '@/lib/echarts'
import { useChartPalette } from '@/hooks/useChartPalette'
import {
  getMetricStatus,
  METRIC_STATUS_BADGE_VARIANT,
  METRIC_STATUS_VALUE_CLASS,
} from '@/lib/metricStatus'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/metric'
import type { PinTelemetry } from '@/types/telemetry'

export function PinTelemetryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-[120px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function PinTelemetryCard({ pin, metric }: { pin: PinTelemetry; metric?: Metric }) {
  const palette = useChartPalette()
  const chartOption = useMemo(
    () => buildSparklineOption(pin.history, palette),
    [pin.history, palette]
  )
  const status = getMetricStatus(pin.latestValue, metric?.minValue, metric?.maxValue)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{pin.name}</span>
          {status === 'ok' ? (
            <Badge variant="outline">{pin.metricCode ?? 'Chưa gán metric'}</Badge>
          ) : (
            <Badge variant={METRIC_STATUS_BADGE_VARIANT[status]}>
              {status === 'critical' ? 'Ngoài ngưỡng' : 'Gần ngưỡng'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {pin.type} · Chân {pin.pinNumber}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p
            className={cn(
              'text-3xl font-semibold tabular transition-colors duration-(--motion-base)',
              METRIC_STATUS_VALUE_CLASS[status]
            )}
          >
            {pin.latestValue ?? '—'}
            {pin.unit && pin.latestValue != null && (
              <span className="ml-1 text-base font-normal text-muted-foreground">{pin.unit}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {pin.latestMeasuredAt
              ? `Cập nhật lúc ${new Date(pin.latestMeasuredAt).toLocaleTimeString('vi-VN')}`
              : 'Chưa có dữ liệu'}
          </p>
        </div>

        {pin.history.length > 1 ? (
          <ReactECharts option={chartOption} style={{ height: 120 }} notMerge />
        ) : (
          <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Chưa đủ dữ liệu để vẽ biểu đồ
          </div>
        )}
      </CardContent>
    </Card>
  )
}
