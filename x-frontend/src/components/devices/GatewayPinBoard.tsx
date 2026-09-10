import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { RelaySwitch } from '@/components/RelaySwitch'
import { PinActionsMenu } from '@/components/devices/PinActionsMenu'
import { PinReadout } from '@/components/devices/PinReadout'
import { PinStatusDot } from '@/components/devices/PinStatusDot'
import { metricChipStyle, metricColorVar } from '@/lib/metricColors'
import { getMetricThreshold } from '@/lib/metricStatus'
import { pinLabel } from '@/lib/pinLabels'
import { cn } from '@/lib/utils'
import type { useCommandUpdates } from '@/hooks/useCommandUpdates'
import type { MetricThreshold } from '@/lib/metricStatus'
import type { GatewayPinViews, PinView } from '@/lib/gatewayPinView'

/**
 * Toàn bộ chân của gateway trong một khối, mỗi chân một hàng — đọc lướt từ trên xuống là biết
 * thiết bị đang ra sao, không phải quét mắt qua một lưới card.
 *
 * Cố ý KHÔNG có sparkline ở đây: diễn biến theo thời gian nằm ở tab Biểu đồ. Vẽ cả hai chỗ là
 * cùng một dữ liệu hiện hai lần, và hàng dày cộm lên thì mất luôn tác dụng đọc lướt.
 */

function round(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(1))
}

/** Chỉ vượt ngưỡng mới gắn badge, và badge phải nói rõ vượt đầu nào, cách mốc bao xa. */
function thresholdLabel(threshold: MetricThreshold, value: number | null | undefined) {
  const side = threshold.bound === 'upper' ? 'trên' : 'dưới'
  if (value == null || threshold.limit == null) return 'Ngoài ngưỡng'
  return `Ngoài ngưỡng ${side} (${round(value)} / ${round(threshold.limit)})`
}

function RailLabel({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2 first:border-t-0">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </span>
      <span className="text-xs tabular text-muted-foreground">({count})</span>
    </div>
  )
}

function PinRow({
  gatewayId,
  view,
  gatewayOnline,
  commandUpdates,
}: {
  gatewayId: number
  view: PinView
  gatewayOnline: boolean
  commandUpdates: ReturnType<typeof useCommandUpdates>['commandUpdates']
}) {
  const { pin, telemetry, metric } = view
  const isOutput = pin.direction === 'OUTPUT'
  const threshold = getMetricThreshold(telemetry?.latestValue, metric?.minValue, metric?.maxValue)
  // Màu nhóm chỉ số nằm ở MÃ CHÂN chứ không ở tên: tên chân do người dùng đặt, mỗi hàng một chuỗi
  // khác nhau — tô màu cả cột tên thì chín hàng chín màu chữ, đọc mệt. Mã chân là ô nhỏ, cố định
  // bề ngang, xếp thẳng cột: tô ở đó thì lướt dọc một phát là gom được nhóm.
  const codeColor = !isOutput && pin.enabled ? metricColorVar(metric?.code) : undefined

  return (
    <div className="flex items-center gap-3 border-t px-4 py-2.5 transition-colors duration-(--motion-fast) hover:bg-muted/50">
      <PinStatusDot view={view} gatewayOnline={gatewayOnline} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            style={codeColor ? metricChipStyle(codeColor) : undefined}
            className="w-12 shrink-0 cursor-help justify-center rounded-md font-mono text-[11px] font-semibold"
          >
            {pin.type}
            {pin.pinNumber}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{pinLabel(pin.type, pin.pinNumber)}</TooltipContent>
      </Tooltip>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn('truncate text-sm font-medium', !pin.enabled && 'text-muted-foreground')}>
          {pin.name}
        </span>
        {/* Chỉ badge khi đã vượt ngưỡng. "Gần ngưỡng" gắn badge thì trên một trại bình thường
            phần lớn hàng đều có badge, và badge nào cũng có thì không hàng nào nổi lên. */}
        {!isOutput && pin.enabled && threshold.status === 'critical' && (
          <StatusBadge
            className="shrink-0 tabular"
            status="CRITICAL"
            label={thresholdLabel(threshold, telemetry?.latestValue)}
          />
        )}
        {!pin.enabled && <StatusBadge className="shrink-0" status="DISABLED" label="Đã tắt" />}
      </div>

      {/* Cột giá trị phải có bề ngang cố định. Để nó co theo nội dung thì "44.7 °C" và
          "175.2 ppm" rộng khác nhau, và vì nó nằm bên PHẢI nên mọi thứ bên trái — kể cả chip chỉ
          số — bị đẩy lệch mỗi hàng một ít. */}
      <div className="flex w-32 shrink-0 justify-end">
        <PinReadout view={view} className="text-sm font-semibold" />
      </div>

      {isOutput && (
        <RelaySwitch
          gatewayId={gatewayId}
          pinId={pin.id}
          pinName={pin.name}
          powerReportedState={pin.powerReportedState}
          commandUpdates={commandUpdates}
          disabled={!pin.enabled}
        />
      )}

      <PinActionsMenu gatewayId={gatewayId} pin={pin} className="-mr-1.5 size-6" />
    </div>
  )
}

export function GatewayPinBoardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="mx-4 my-3.5 h-5 rounded" />
      ))}
    </div>
  )
}

export function GatewayPinBoard({
  gatewayId,
  views,
  gatewayOnline,
  commandUpdates,
}: {
  gatewayId: number
  views: GatewayPinViews
  gatewayOnline: boolean
  commandUpdates: ReturnType<typeof useCommandUpdates>['commandUpdates']
}) {
  const { inputs, outputs } = views

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      {inputs.length > 0 && (
        <>
          <RailLabel title="Đầu vào · cảm biến" count={inputs.length} />
          {inputs.map((view) => (
            <PinRow
              key={view.pin.id}
              gatewayId={gatewayId}
              view={view}
              gatewayOnline={gatewayOnline}
              commandUpdates={commandUpdates}
            />
          ))}
        </>
      )}

      {outputs.length > 0 && (
        <>
          <RailLabel title="Đầu ra · điều khiển" count={outputs.length} />
          {outputs.map((view) => (
            <PinRow
              key={view.pin.id}
              gatewayId={gatewayId}
              view={view}
              gatewayOnline={gatewayOnline}
              commandUpdates={commandUpdates}
            />
          ))}
        </>
      )}
    </div>
  )
}
