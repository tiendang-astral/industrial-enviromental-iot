import { memo, useEffect, useReducer } from 'react'
import { Widget } from '@/components/widgets/Widget'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/datetime'
import { isReadingLive } from '@/lib/gatewayStatus'
import { getMetricThreshold, METRIC_STATUS_VALUE_CLASS } from '@/lib/metricStatus'
import type { Datastream, DatastreamReading, Widget as WidgetT } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

interface ValueWidgetProps {
  widget: WidgetT
  datastream?: Datastream
  /** Widget bind kênh không có trong phạm vi board — xem DashboardBoard. */
  orphaned?: boolean
  reading?: DatastreamReading
  metric?: Metric
}

// memo — DashboardPage re-render liên tục lúc kéo/resize 1 widget (track liveMaxRow),
// không memo thì MỌI widget khác cũng re-render theo, gây nháy dù props không đổi.
export const ValueWidget = memo(function ValueWidget({ widget, datastream, reading, metric, orphaned }: ValueWidgetProps) {
  const threshold = getMetricThreshold(reading?.latestValue, metric?.minValue, metric?.maxValue)
  const unit = datastream?.metricUnit
  // Nêu ĐỦ hai đầu ngưỡng: biết "trên 35" mà không biết "dưới 20" thì vẫn phải đi tra chỗ khác mới
  // biết giá trị hiện tại đang lệch về phía nào và còn cách đầu kia bao xa.
  const thresholdLabel =
    threshold.status === 'ok'
      ? null
      : [metric?.minValue, metric?.maxValue].every((bound) => bound != null)
        ? `Ngưỡng ${metric!.minValue}–${metric!.maxValue}${unit ? ` ${unit}` : ''}`
        : `Ngưỡng ${threshold.bound === 'upper' ? '≤' : '≥'} ${threshold.limit}${unit ? ` ${unit}` : ''}`
  const live = isReadingLive(reading?.latestMeasuredAt)

  // Còn live thì phải tự nhịp lại: nguồn ngừng gửi là không còn props nào đổi, không có nhịp này
  // badge "Live" sẽ đứng nguyên vĩnh viễn trên một kênh đã chết. Hết live thì dừng hẳn timer.
  const [, tick] = useReducer((count: number) => count + 1, 0)
  useEffect(() => {
    if (!live) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [live])

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
      />
      <Widget.Body className="items-center text-center">
        <p
          className={cn(
            // Chỉ transition màu — số nhảy phải đổi tức thì, người trực ca cần thấy đúng giá trị hiện tại.
            'min-w-0 truncate text-3xl font-semibold tabular transition-colors duration-(--motion-base)',
            METRIC_STATUS_VALUE_CLASS[threshold.status]
          )}
        >
          {reading?.latestValue != null ? reading.latestValue : '—'}
          {unit && reading?.latestValue != null && (
            <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
          )}
        </p>
        <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-1.5 text-xs text-muted-foreground">
          {/* Đang live thì mốc thời gian không nói thêm gì (nó luôn là "vừa nãy"), nhường chỗ cho
              badge. Nguội rồi mới cần mốc, và phải kèm NGÀY — "16:34" của ba hôm trước đọc ra y hệt
              số đo mới nhất. */}
          {live ? (
            <Badge
              variant="ok"
              className="shrink-0 gap-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wide"
            >
              {/* Chấm sáng: dấu hiệu trạng thái thật (đang nhận số đo), không phải chấm trang trí. */}
              <span className="size-1.5 rounded-full bg-ok shadow-[0_0_5px_var(--ok)]" />
              Live
            </Badge>
          ) : (
            <span className="min-w-0 truncate">
              {reading?.latestMeasuredAt ? formatDateTime(reading.latestMeasuredAt) : 'Chưa có dữ liệu'}
            </span>
          )}
          {/* Nói thẳng con số ngưỡng thay vì nhãn "gần ngưỡng" chung chung — người trực ca cần biết
              còn cách bao nhiêu, không cần biết tên mức độ. */}
          {thresholdLabel && (
            <span className={cn('shrink-0 tabular', METRIC_STATUS_VALUE_CLASS[threshold.status])}>
              {thresholdLabel}
            </span>
          )}
        </p>
      </Widget.Body>
      {threshold.status !== 'ok' && <Widget.StatusBar tone={threshold.status} />}
    </Widget>
  )
})
