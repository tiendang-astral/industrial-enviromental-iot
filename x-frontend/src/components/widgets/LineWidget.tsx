import { memo, useMemo } from 'react'
import { ChartLine } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { ResizableChart } from '@/components/widgets/ResizableChart'
import { Badge } from '@/components/ui/badge'
import { buildAxisLineOption } from '@/lib/echarts'
import { useChartPalette } from '@/hooks/useChartPalette'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'

interface LineWidgetProps {
  widget: WidgetT
  datastream?: Datastream
  reading?: DatastreamReading
}

// memo — tránh nháy widget khi kéo/resize widget khác trên cùng dashboard (xem ValueWidget).
export const LineWidget = memo(function LineWidget({ widget, datastream, reading }: LineWidgetProps) {
  const history = reading?.history ?? []
  const palette = useChartPalette()
  const chartOption = useMemo(
    () => buildAxisLineOption(history, datastream?.metricUnit, palette),
    [history, datastream?.metricUnit, palette]
  )

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        icon={ChartLine}
        iconClassName="text-muted-foreground"
        badge={
          datastream?.sourceEnabled === false ? (
            <Badge variant="outline" className="shrink-0">
              Pin đã tắt
            </Badge>
          ) : undefined
        }
      />
      <Widget.Body>
        {history.length > 1 ? (
          <ResizableChart option={chartOption} />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted-foreground">
            Chưa đủ dữ liệu để vẽ biểu đồ
          </div>
        )}
      </Widget.Body>
    </Widget>
  )
})
