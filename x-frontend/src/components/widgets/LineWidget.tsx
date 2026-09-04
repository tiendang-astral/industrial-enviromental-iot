import { memo } from 'react'
import { ChartLine } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { TrendChart } from '@/components/patterns/TrendChart'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'

interface LineWidgetProps {
  widget: WidgetT
  datastream?: Datastream
  /** Widget bind kênh không có trong phạm vi board — xem DashboardBoard. */
  orphaned?: boolean
  reading?: DatastreamReading
}

// memo — tránh nháy widget khi kéo/resize widget khác trên cùng dashboard (xem ValueWidget).
export const LineWidget = memo(function LineWidget({ widget, datastream, reading, orphaned }: LineWidgetProps) {
  const history = reading?.history ?? []

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        icon={ChartLine}
        iconClassName="text-muted-foreground"
        badge={
          orphaned ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="shrink-0">
                  Ngoài phạm vi
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Kênh này không còn thuộc đơn vị đang xem (có thể đã chuyển sang đơn vị khác) hoặc đã
                bị xóa. Widget sẽ không nhận dữ liệu mới ở đây.
              </TooltipContent>
            </Tooltip>
          ) : datastream?.sourceEnabled === false ? (
            <Badge variant="outline" className="shrink-0">
              Pin đã tắt
            </Badge>
          ) : undefined
        }
      />
      <Widget.Body>
        <TrendChart
          history={history}
          variant="axis"
          unit={datastream?.metricUnit}
          emptyLabel="Chưa đủ dữ liệu để vẽ biểu đồ"
        />
      </Widget.Body>
    </Widget>
  )
})
