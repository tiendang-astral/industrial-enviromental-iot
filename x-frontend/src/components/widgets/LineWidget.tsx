import { memo, useMemo, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { RangePicker } from '@/components/dashboard/RangePicker'
import { WidgetChartDialog } from '@/components/dashboard/WidgetChartDialog'
import { TrendChart } from '@/components/patterns/TrendChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDatastreamTelemetryQuery } from '@/queries/useDatastreamTelemetryQuery'
import { DEFAULT_RANGE_MINUTES } from '@/lib/telemetryRanges'
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
  // Khoảng thời gian là lựa chọn xem, không phải cấu hình widget: ghi vào `layout_json` ngay ở chế
  // độ xem sẽ phá mô hình "bản nháp + bấm Lưu" của board.
  const [rangeMinutes, setRangeMinutes] = useState<number>(DEFAULT_RANGE_MINUTES)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const datastreamId = widget.binding?.datastreamId
  const { data: telemetry, isLoading } = useDatastreamTelemetryQuery(datastreamId, rangeMinutes)

  // Lịch sử từ server + phần realtime bắn về SAU điểm cuối đã tải. Không lọc theo mốc đó thì mỗi
  // lần server làm mới, các điểm cuối bị đếm hai lần và biểu đồ có một đoạn răng cưa giả.
  const history = useMemo(() => {
    const base = telemetry?.history ?? []
    const live = reading?.history ?? []
    if (base.length === 0) return live
    const lastAt = new Date(base[base.length - 1].measuredAt).getTime()
    return [...base, ...live.filter((point) => new Date(point.measuredAt).getTime() > lastAt)]
  }, [telemetry, reading])

  const unit = datastream?.metricUnit ?? telemetry?.unit

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
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
        actions={
          datastreamId != null && (
            // widget-no-drag: RGL nhận cả cú bấm vào đây thành cú kéo, mở ô chọn xong thả chuột là
            // widget nhảy chỗ. Xem `dragConfig.cancel` ở DashboardBoard.
            <div className="widget-no-drag flex shrink-0 items-center gap-1">
              <RangePicker value={rangeMinutes} onChange={setRangeMinutes} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setIsDetailOpen(true)}
                  >
                    <Maximize2 />
                    <span className="sr-only">Xem chi tiết {widget.title}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xem chi tiết, phóng to</TooltipContent>
              </Tooltip>
            </div>
          )
        }
      />
      {/* Biểu đồ tràn sát mép card: hình dáng đó là thứ phân biệt widget biểu đồ với ô số khi lướt
          mắt, và trục thời gian dùng được hết bề ngang thay vì bị padding ăn mất 2rem. */}
      <Widget.Body className="-mx-4 -mb-4 justify-end">
        <TrendChart
          history={history}
          variant="axis"
          unit={unit}
          emptyLabel={isLoading ? 'Đang tải số đo…' : 'Chưa đủ dữ liệu để vẽ biểu đồ'}
        />
      </Widget.Body>

      <WidgetChartDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={widget.title}
        history={history}
        unit={unit}
        isLoading={isLoading}
        rangeMinutes={rangeMinutes}
        onRangeChange={setRangeMinutes}
        bucketSeconds={telemetry?.bucketSeconds}
      />
    </Widget>
  )
})
