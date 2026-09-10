import { memo, useMemo, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { RangePicker } from '@/components/dashboard/RangePicker'
import { WidgetChartDialog } from '@/components/dashboard/WidgetChartDialog'
import { TrendChart } from '@/components/patterns/TrendChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDatastreamsTelemetryQueries } from '@/queries/useDatastreamTelemetryQuery'
import { DEFAULT_RANGE_MINUTES } from '@/lib/telemetryRanges'
import type { ChartSeries } from '@/lib/echarts'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'

interface LineWidgetProps {
  widget: WidgetT
  /** Mọi kênh widget đang bind — mỗi kênh một đường trên cùng biểu đồ (cùng chỉ số = cùng đơn vị). */
  datastreams: Datastream[]
  orphaned?: boolean
  readings: Record<number, DatastreamReading>
}

// memo — tránh nháy widget khi kéo/resize widget khác trên cùng dashboard (xem ValueWidget).
export const LineWidget = memo(function LineWidget({
  widget,
  datastreams,
  readings,
  orphaned,
}: LineWidgetProps) {
  // Khoảng thời gian là lựa chọn xem, không phải cấu hình widget: ghi vào `layout_json` ngay ở chế
  // độ xem sẽ phá mô hình "bản nháp + bấm Lưu" của board.
  const [rangeMinutes, setRangeMinutes] = useState<number>(DEFAULT_RANGE_MINUTES)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const ids = useMemo(() => datastreams.map((datastream) => datastream.id), [datastreams])
  const { data: telemetry, isLoading } = useDatastreamsTelemetryQueries(ids, rangeMinutes)

  // Lịch sử từ server + phần realtime bắn về SAU điểm cuối đã tải. Không lọc theo mốc đó thì mỗi
  // lần server làm mới, các điểm cuối bị đếm hai lần và biểu đồ có một đoạn răng cưa giả.
  const series: ChartSeries[] = useMemo(
    () =>
      datastreams.map((datastream, index) => {
        const base = telemetry[index]?.history ?? []
        const live = readings[datastream.id]?.history ?? []
        const lastAt = base.length ? new Date(base[base.length - 1].measuredAt).getTime() : 0
        const points = base.length
          ? [...base, ...live.filter((point) => new Date(point.measuredAt).getTime() > lastAt)]
          : live
        return { label: datastream.name, points }
      }),
    // `readings` là object MỚI sau mỗi message STOMP của bất kỳ kênh nào trên board. Khoá theo mốc
    // thời gian của đúng những kênh widget này bind, để nó chỉ dựng lại khi CHÍNH nó có số đo mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datastreams, telemetry, datastreams.map((ds) => readings[ds.id]?.latestMeasuredAt ?? '').join('|')]
  )

  const unit = datastreams[0]?.metricUnit ?? telemetry[0]?.unit
  const hasData = series.some((item) => item.points.length > 1)

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        badge={
          orphaned ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="shrink-0">
                  Đã xoá
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Kênh này không còn thuộc đơn vị đang xem (có thể đã chuyển sang đơn vị khác) hoặc đã
                bị xóa. Widget sẽ không nhận dữ liệu mới ở đây.
              </TooltipContent>
            </Tooltip>
          ) : datastreams.length === 1 && datastreams[0].sourceEnabled === false ? (
            <Badge variant="outline" className="shrink-0">
              Pin đã tắt
            </Badge>
          ) : undefined
        }
        actions={
          ids.length > 0 && (
            // widget-no-drag: RGL nhận cả cú bấm vào đây thành cú kéo, mở ô chọn xong thả chuột là
            // widget nhảy chỗ. Xem `dragConfig.cancel` ở DashboardBoard.
            <div className="widget-no-drag flex shrink-0 items-center gap-1">
              <RangePicker value={rangeMinutes} onChange={setRangeMinutes} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsDetailOpen(true)}>
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
          series={series}
          variant="axis"
          unit={unit}
          emptyLabel={isLoading && !hasData ? 'Đang tải số đo…' : 'Chưa đủ dữ liệu để vẽ biểu đồ'}
        />
      </Widget.Body>

      <WidgetChartDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={widget.title}
        series={series}
        unit={unit}
        isLoading={isLoading}
        rangeMinutes={rangeMinutes}
        onRangeChange={setRangeMinutes}
        bucketSeconds={telemetry[0]?.bucketSeconds}
      />
    </Widget>
  )
})
