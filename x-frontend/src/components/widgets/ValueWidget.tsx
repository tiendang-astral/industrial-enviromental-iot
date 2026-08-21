import { memo } from 'react'
import { Gauge } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getMetricStatus, METRIC_STATUS_BADGE_VARIANT, METRIC_STATUS_VALUE_CLASS } from '@/lib/metricStatus'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

interface ValueWidgetProps {
  widget: WidgetT
  datastream?: Datastream
  reading?: DatastreamReading
  metric?: Metric
}

// memo — DashboardPage re-render liên tục lúc kéo/resize 1 widget (track liveMaxRow),
// không memo thì MỌI widget khác cũng re-render theo, gây nháy dù props không đổi.
export const ValueWidget = memo(function ValueWidget({ widget, datastream, reading, metric }: ValueWidgetProps) {
  const status = getMetricStatus(reading?.latestValue, metric?.minValue, metric?.maxValue)

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        icon={Gauge}
        iconClassName="text-primary"
        badge={
          datastream?.sourceEnabled === false ? (
            <Badge variant="outline" className="shrink-0">
              Pin đã tắt
            </Badge>
          ) : status !== 'ok' ? (
            <Badge variant={METRIC_STATUS_BADGE_VARIANT[status]} className="shrink-0">
              {status === 'critical' ? 'Ngoài ngưỡng' : 'Gần ngưỡng'}
            </Badge>
          ) : undefined
        }
      />
      <Widget.Body>
        <p
          className={cn(
            // Chỉ transition màu — số nhảy phải đổi tức thì, người trực ca cần thấy đúng giá trị hiện tại.
            'min-w-0 truncate text-3xl font-semibold tabular transition-colors duration-(--motion-base)',
            METRIC_STATUS_VALUE_CLASS[status]
          )}
        >
          {reading?.latestValue != null ? reading.latestValue : '—'}
          {datastream?.metricUnit && reading?.latestValue != null && (
            <span className="ml-1 text-base font-normal text-muted-foreground">{datastream.metricUnit}</span>
          )}
        </p>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {reading?.latestMeasuredAt
            ? `Cập nhật lúc ${new Date(reading.latestMeasuredAt).toLocaleTimeString('vi-VN')}`
            : 'Chưa có dữ liệu'}
        </p>
      </Widget.Body>
    </Widget>
  )
})
