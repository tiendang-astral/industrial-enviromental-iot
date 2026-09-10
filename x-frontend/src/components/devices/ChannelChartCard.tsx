import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { TrendChart } from '@/components/patterns/TrendChart'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { metricChipStyle, metricColorVar } from '@/lib/metricColors'
import { pinLabel } from '@/lib/pinLabels'
import type { PinView } from '@/lib/gatewayPinView'

const CHART_HEIGHT = 200

/** Thống kê tính từ chính chuỗi điểm đang vẽ, không phải từ dữ liệu thô — nói đúng cái mắt thấy. */
function stats(values: number[]) {
  if (values.length === 0) return null
  const sum = values.reduce((total, value) => total + value, 0)
  return { min: Math.min(...values), max: Math.max(...values), avg: sum / values.length }
}

function round(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(1))
}

export function ChannelChartCard({ view }: { view: PinView }) {
  const { pin, telemetry, metric } = view
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  const unit = telemetry?.unit ?? metric?.unit
  const history = telemetry?.history ?? []
  // Chỉ thống kê khi biểu đồ thật sự vẽ được (TrendChart cần >1 điểm) — hiện "nhỏ nhất/lớn nhất"
  // bên dưới một khung báo "chưa đủ số đo" là hai câu đá nhau trên cùng một card.
  const summary = history.length > 1 ? stats(history.map((point) => point.value)) : null
  // Cùng màu với nhãn và con số của chân này ở tab Tổng quan.
  const color = pin.enabled ? metricColorVar(metric?.code) : undefined

  return (
    <Card ref={ref}>
      <CardContent className="flex flex-col gap-3">
        {/* Tiêu đề gọn một dòng: tên kèm đơn vị trong ngoặc, mã chân trong badge. Nhãn dài
            ("Đầu vào analog · chân số 1") lùi vào tooltip — nó lặp lại ở mọi card mà chỉ đọc một
            lần là hiểu, để ngoài thì ăn mất một dòng của mỗi biểu đồ. */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium">
            {pin.name}
            {unit && <span className="ml-1 font-normal text-muted-foreground">({unit})</span>}
          </span>
          {!pin.enabled && (
            <StatusBadge className="shrink-0" status="DISABLED" label="Chân đã tắt" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Khớp bảng ở tab Tổng quan: màu nhóm chỉ số nằm trên mã chân. */}
              <EnumBadge
                style={color ? metricChipStyle(color) : undefined}
                className="shrink-0 cursor-help rounded-md font-mono"
              >
                {pin.type}
                {pin.pinNumber}
              </EnumBadge>
            </TooltipTrigger>
            <TooltipContent>{pinLabel(pin.type, pin.pinNumber)}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex" style={{ height: CHART_HEIGHT }}>
          {inView ? (
            <TrendChart
              history={history}
              variant="axis"
              unit={unit}
              metricCode={pin.enabled ? metric?.code : undefined}
              emptyLabel="Chưa đủ số đo trong khoảng này"
            />
          ) : (
            <Skeleton className="w-full rounded-lg" />
          )}
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Nhỏ nhất <span className="tabular text-foreground">{round(summary.min)}</span>
            </span>
            <span>
              Lớn nhất <span className="tabular text-foreground">{round(summary.max)}</span>
            </span>
            <span>
              Trung bình <span className="tabular text-foreground">{round(summary.avg)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
