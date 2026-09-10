import { memo, useEffect, useReducer, useState } from 'react'
import { Widget } from '@/components/widgets/Widget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useDatastreamsLatestQueries } from '@/queries/useDatastreamTelemetryQuery'
import { formatDateTime, formatTime } from '@/lib/datetime'
import { isReadingLive } from '@/lib/gatewayStatus'
import { getMetricThreshold, METRIC_STATUS_VALUE_CLASS } from '@/lib/metricStatus'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

interface ValueWidgetProps {
  widget: WidgetT
  /** Mọi kênh widget đang bind. Một kênh = số to; nhiều kênh = danh sách số nhỏ. */
  datastreams: Datastream[]
  orphaned?: boolean
  readings: Record<number, DatastreamReading>
  metricByCode: Map<string, Metric>
}

/**
 * Số cột số vừa một ô. Ô KHÔNG tự nở — nở là đẩy mọi hàng dưới xuống, mất đúng tính chất "mẫu khai
 * toạ độ nào thì nằm đúng đó". Phần dư gom vào nút `+N`.
 */
const VISIBLE_COLUMNS = 3

type ChannelRow = {
  datastream: Datastream
  value: number | null
  measuredAt: string | null
  threshold: ReturnType<typeof getMetricThreshold>
  /** Số vừa về qua STOMP và còn tươi. Số lấy từ API thì hiện mốc thời gian của chính điểm đó. */
  live: boolean
}

// memo — DashboardPage re-render liên tục lúc kéo/resize 1 widget (track liveMaxRow),
// không memo thì MỌI widget khác cũng re-render theo, gây nháy dù props không đổi.
export const ValueWidget = memo(function ValueWidget({
  widget,
  datastreams,
  readings,
  metricByCode,
  orphaned,
}: ValueWidgetProps) {
  const [isAllOpen, setIsAllOpen] = useState(false)

  // Realtime chỉ bắn khi có số đo MỚI, nên mở trang lên là rỗng cho tới nhịp kế tiếp — kênh chạy
  // theo cron có thể 5 phút sau mới có. Lấy giá trị mới nhất từ API làm nền, realtime đè lên.
  const latest = useDatastreamsLatestQueries(datastreams.map((datastream) => datastream.id))

  const rows: ChannelRow[] = datastreams.map((datastream, index) => {
    const realtime = readings[datastream.id]
    const fromRealtime = realtime?.latestValue != null
    const value = (fromRealtime ? realtime.latestValue : latest[index]?.latestValue) ?? null
    const measuredAt = (fromRealtime ? realtime.latestMeasuredAt : latest[index]?.latestMeasuredAt) ?? null
    const metric = datastream.metricCode ? metricByCode.get(datastream.metricCode) : undefined
    return {
      datastream,
      value,
      measuredAt,
      threshold: getMetricThreshold(value, metric?.minValue, metric?.maxValue),
      live: fromRealtime && isReadingLive(measuredAt),
    }
  })

  // Nguồn ngừng gửi là không còn props nào đổi — không có nhịp này thì badge "Live" đứng nguyên
  // vĩnh viễn trên một kênh đã chết. Hết live thì dừng hẳn timer.
  const anyLive = rows.some((row) => row.live)
  const [, tick] = useReducer((count: number) => count + 1, 0)
  useEffect(() => {
    if (!anyLive) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [anyLive])

  const unit = datastreams[0]?.metricUnit
  const single = rows.length === 1 ? rows[0] : undefined

  const badge = orphaned ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="destructive" className="shrink-0">
          Đã xoá
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Kênh này không còn thuộc đơn vị đang xem (có thể đã chuyển sang đơn vị khác) hoặc đã bị xóa.
        Widget sẽ không nhận dữ liệu mới ở đây.
      </TooltipContent>
    </Tooltip>
  ) : single?.datastream.sourceEnabled === false ? (
    <Badge variant="outline" className="shrink-0">
      Pin đã tắt
    </Badge>
  ) : undefined

  // --- Một kênh (hoặc chưa bind): giữ con số to, đó là lý do tồn tại của widget này ---
  if (rows.length <= 1) {
    const threshold = single?.threshold
    const metric = single?.datastream.metricCode ? metricByCode.get(single.datastream.metricCode) : undefined
    const thresholdLabel =
      !threshold || threshold.status === 'ok'
        ? null
        : metric?.minValue != null && metric?.maxValue != null
          ? `Ngưỡng ${metric.minValue}–${metric.maxValue}${unit ? ` ${unit}` : ''}`
          : `Ngưỡng ${threshold.bound === 'upper' ? '≤' : '≥'} ${threshold.limit}${unit ? ` ${unit}` : ''}`

    return (
      <Widget>
        <Widget.Header title={widget.title} badge={badge} />
        <Widget.Body className="items-center text-center">
          <p
            className={cn(
              // Chỉ transition màu — số nhảy phải đổi tức thì, người trực ca cần thấy đúng giá trị hiện tại.
              'min-w-0 truncate text-3xl font-semibold tabular transition-colors duration-(--motion-base)',
              threshold && METRIC_STATUS_VALUE_CLASS[threshold.status]
            )}
          >
            {single?.value != null ? single.value : '—'}
            {unit && single?.value != null && (
              <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
            )}
          </p>
          <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-1.5 text-xs text-muted-foreground">
            {single?.live ? (
              <LiveBadge />
            ) : (
              <span className="min-w-0 truncate">
                {single?.measuredAt ? formatDateTime(single.measuredAt) : 'Chưa có dữ liệu'}
              </span>
            )}
            {thresholdLabel && threshold && (
              <span className={cn('shrink-0 tabular', METRIC_STATUS_VALUE_CLASS[threshold.status])}>
                {thresholdLabel}
              </span>
            )}
          </p>
        </Widget.Body>
        {threshold && threshold.status !== 'ok' && <Widget.StatusBar tone={threshold.status} />}
      </Widget>
    )
  }

  // --- Nhiều kênh: danh sách số nhỏ, mỗi đơn vị một dòng ---
  const hidden = rows.length - VISIBLE_COLUMNS
  const worst = rows.some((row) => row.threshold.status === 'critical')
    ? ('critical' as const)
    : rows.some((row) => row.threshold.status === 'warning')
      ? ('warning' as const)
      : null

  return (
    <Widget>
      <Widget.Header
        title={widget.title}
        badge={badge}
        actions={
          hidden > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="widget-no-drag h-6 shrink-0 px-1.5 text-xs"
              onClick={() => setIsAllOpen(true)}
            >
              +{hidden}
            </Button>
          ) : undefined
        }
      />
      <Widget.Body className="overflow-hidden">
        <ChannelValues rows={rows.slice(0, VISIBLE_COLUMNS)} unit={unit} />
      </Widget.Body>
      {worst && <Widget.StatusBar tone={worst} />}

      <Dialog open={isAllOpen} onOpenChange={setIsAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">{widget.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <ChannelValues rows={rows} unit={unit} wrap />
          </div>
        </DialogContent>
      </Dialog>
    </Widget>
  )
})

function LiveBadge() {
  return (
    <Badge variant="ok" className="shrink-0 gap-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wide">
      {/* Chấm sáng: dấu hiệu trạng thái thật (đang nhận số đo), không phải chấm trang trí. */}
      <span className="size-1.5 rounded-full bg-ok shadow-[0_0_5px_var(--ok)]" />
      Live
    </Badge>
  )
}

function ChannelValues({
  rows,
  unit,
  wrap = false,
}: {
  rows: ChannelRow[]
  unit?: string | null
  wrap?: boolean
}) {
  // Ba cột trong ô rộng 3 cột chỉ còn ~80px mỗi cột, mà giá trị nay kéo theo cả đơn vị — cỡ lớn là
  // bị cắt thành "25.53…". Thu cỡ chữ và lề theo số cột thay vì để truncate ăn mất đơn vị.
  const valueSize = wrap || rows.length <= 2 ? 'text-2xl' : 'text-base'
  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 items-stretch divide-x divide-border',
        wrap && 'flex-wrap divide-x-0'
      )}
    >
      {rows.map(({ datastream, value, measuredAt, threshold, live }) => (
        <div
          key={datastream.id}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1',
            wrap ? 'min-w-32 border-b border-border px-2 py-3' : rows.length > 2 ? 'px-1' : 'px-2'
          )}
        >
          <p className="min-w-0 max-w-full truncate text-[11px] text-muted-foreground">{datastream.name}</p>
          <p
            className={cn(
              'min-w-0 max-w-full truncate font-semibold tabular transition-colors duration-(--motion-base)',
              valueSize,
              METRIC_STATUS_VALUE_CLASS[threshold.status]
            )}
          >
            {value ?? '—'}
            {unit && value != null && (
              <span className={cn('ml-0.5 font-normal text-muted-foreground', valueSize === 'text-2xl' ? 'text-xs' : 'text-[10px]')}>
                {unit}
              </span>
            )}
          </p>
          {/* Vừa về qua realtime thì badge; số lấy từ API thì nói mốc của chính điểm đó. */}
          {live ? (
            <LiveBadge />
          ) : (
            <span className="min-w-0 max-w-full truncate text-[10px] tabular text-muted-foreground/70">
              {measuredAt ? formatTime(measuredAt) : '—'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
