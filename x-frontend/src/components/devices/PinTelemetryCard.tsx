import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { buildPinTrendOption } from '@/lib/echarts'
import { useChartPalette } from '@/hooks/useChartPalette'
import { formatClock } from '@/lib/datetime'
import { getMetricStatus, METRIC_STATUS_VALUE_CLASS } from '@/lib/metricStatus'
import { pinLabel } from '@/lib/pinLabels'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/metric'
import type { PinTelemetry } from '@/types/telemetry'

// Đủ chỗ cho mốc giờ dưới trục X mà vẫn nhỏ hơn hẳn con số giá trị bên trái — biểu đồ ở đây là
// phần bổ trợ, không phải nội dung chính của card.
const CHART_HEIGHT = 96

/** Khớp `TELEMETRY_RANGE_MINUTES` ở GatewayDetailPage — biểu đồ trải đúng khoảng đã tải về. */
const TREND_RANGE_MINUTES = 24 * 60

export function PinTelemetryCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-[96px] w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Một chân đọc dữ liệu. Khối định danh trải hết bề ngang; giá trị hiện tại và đường xu hướng
 * đứng cùng một hàng bên dưới — người trực đọc chúng như một câu duy nhất: "đang 23.5 độ, và
 * đang đi lên".
 */
export function PinTelemetryCard({ pin, metric }: { pin: PinTelemetry; metric?: Metric }) {
  const palette = useChartPalette()
  const chartOption = useMemo(
    () => buildPinTrendOption(pin.history, palette, TREND_RANGE_MINUTES, Date.now()),
    [pin.history, palette]
  )
  const status = getMetricStatus(pin.latestValue, metric?.minValue, metric?.maxValue)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {/* Không wrap: tên dài thì cắt bớt chứ không đẩy chip xuống dòng — chip nhảy dòng làm
              chiều cao card lệch nhau giữa các ô trong cùng một hàng lưới. */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">{pin.name}</span>
            <EnumBadge className="shrink-0">
              {metric?.name ?? pin.metricCode ?? 'Chưa gán loại đo'}
            </EnumBadge>
            {status !== 'ok' && (
              <StatusBadge
                className="shrink-0"
                status={status === 'critical' ? 'CRITICAL' : 'WARNING'}
                label={status === 'critical' ? 'Ngoài ngưỡng' : 'Gần ngưỡng'}
              />
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {pinLabel(pin.type, pin.pinNumber)}
          </p>
        </div>

        {/* Cột giá trị co theo nội dung, biểu đồ ăn hết phần còn lại. */}
        <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-6">
          {/* h-full + justify-center: con số canh giữa theo chiều cao biểu đồ bên cạnh, không
              dính mép trên khi dòng mốc thời gian vắng mặt. */}
          <div className="flex h-full min-w-0 flex-col justify-center gap-1">
            <p
              className={cn(
                'text-4xl leading-none font-semibold whitespace-nowrap tabular transition-colors duration-(--motion-base)',
                METRIC_STATUS_VALUE_CLASS[status]
              )}
            >
              {pin.latestValue != null ? (
                <>
                  {pin.latestValue}
                  {pin.unit && (
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {pin.unit}
                    </span>
                  )}
                </>
              ) : (
                /*
                 * Gạch ngang nằm ở khoảng giữa chiều cao chữ, còn chữ số đứng trên baseline — để
                 * nguyên thì nó lửng lơ giữa dòng. 0.34em đưa nó xuống đúng baseline, tức đứng
                 * cùng "mặt sàn" với con số sẽ thay chỗ nó. Dùng `em` để đổi cỡ chữ vẫn đúng tỉ lệ.
                 */
                <span className="inline-block translate-y-[0.34em] text-muted-foreground">—</span>
              )}
            </p>
            {pin.latestMeasuredAt && (
              <p className="text-xs whitespace-nowrap text-muted-foreground">
                Cập nhật {formatClock(new Date(pin.latestMeasuredAt).getTime())}
              </p>
            )}
          </div>

          <ReactECharts option={chartOption} style={{ height: CHART_HEIGHT }} notMerge />
        </div>
      </CardContent>
    </Card>
  )
}
