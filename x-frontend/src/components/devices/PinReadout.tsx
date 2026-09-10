import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime } from '@/lib/datetime'
import { metricColorVar } from '@/lib/metricColors'
import { getMetricThreshold } from '@/lib/metricStatus'
import { cn } from '@/lib/utils'
import type { PinView } from '@/lib/gatewayPinView'

/** Số đo hiện tại của một chân: giá trị + đơn vị với chân đọc, badge trạng thái với chân điều khiển. */
export function PinReadout({ view, className }: { view: PinView; className?: string }) {
  const { pin, telemetry, metric } = view

  if (pin.direction === 'OUTPUT') {
    return (
      <StatusBadge
        className={className}
        // Tắt relay là thao tác bình thường, không phải sự cố — status không có trong STATUS_MAP
        // nên rơi về variant `outline` trung tính.
        status={pin.powerReportedState === 'ON' ? 'ENABLED' : 'RELAY_OFF'}
        label={pin.powerReportedState === 'ON' ? 'Đang bật' : 'Đang tắt'}
      />
    )
  }

  if (telemetry?.latestValue == null) {
    return <span className={cn('text-xs text-muted-foreground', className)}>Chưa có số đo</span>
  }

  const unit = telemetry.unit ?? metric?.unit
  // Chỉ tô đỏ khi đã vượt ngưỡng — mức "gần ngưỡng" đã bỏ khỏi badge và chấm, để số vẫn
  // vàng thì ba chỗ nói ba kiểu về cùng một chân.
  const { status } = getMetricThreshold(telemetry.latestValue, metric?.minValue, metric?.maxValue)

  // Bình thường: số mang màu của chỉ số, để mắt nhận ra "đây là nhiệt độ" trước cả khi đọc đơn vị.
  // Vượt ngưỡng: đỏ THẮNG màu chỉ số. Trên màn hình vận hành, đỏ chỉ được có một nghĩa.
  // Chân đã tắt cũng bỏ màu: số còn đó là số cũ, tô màu chỉ số vào nó là nói nó vẫn đang đo.
  const isCritical = status === 'critical'
  const color = isCritical || !pin.enabled ? undefined : metricColorVar(metric?.code)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          style={color ? { color } : undefined}
          className={cn('whitespace-nowrap tabular', isCritical && 'text-critical', className)}
        >
          {telemetry.latestValue}
          {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {telemetry.latestMeasuredAt
          ? `Cập nhật ${formatDateTime(telemetry.latestMeasuredAt)}`
          : 'Chưa có số đo'}
      </TooltipContent>
    </Tooltip>
  )
}
