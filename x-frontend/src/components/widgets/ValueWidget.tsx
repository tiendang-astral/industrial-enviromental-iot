import { memo } from 'react'
import { Widget } from '@/components/widgets/Widget'
import { Badge } from '@/components/ui/badge'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'

interface ValueWidgetProps {
  widget: WidgetT
  datastream?: Datastream
  reading?: DatastreamReading
}

// memo — DashboardPage re-render liên tục lúc kéo/resize 1 widget (track liveMaxRow),
// không memo thì MỌI widget khác cũng re-render theo, gây nháy dù props không đổi.
export const ValueWidget = memo(function ValueWidget({ widget, datastream, reading }: ValueWidgetProps) {
  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        badge={
          datastream?.sourceEnabled === false ? (
            <Badge variant="outline" className="shrink-0">
              Pin đã tắt
            </Badge>
          ) : undefined
        }
      />
      <Widget.Body>
        <p className="min-w-0 truncate text-3xl font-semibold tabular-nums">
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
