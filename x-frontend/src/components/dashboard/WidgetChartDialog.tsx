import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { RangePicker } from '@/components/dashboard/RangePicker'
import { TrendChart } from '@/components/patterns/TrendChart'
import { formatDateTime } from '@/lib/datetime'
import type { ChartSeries } from '@/lib/echarts'

/** Thống kê tính từ chính chuỗi đang vẽ, không phải từ dữ liệu thô — nói đúng cái mắt thấy. */
function stats(series: ChartSeries[]) {
  const values = series.flatMap((item) => item.points.map((point) => point.value))
  if (values.length === 0) return null
  const sum = values.reduce((total, value) => total + value, 0)
  return { min: Math.min(...values), max: Math.max(...values), avg: sum / values.length }
}

function round(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(2))
}

interface WidgetChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  series: ChartSeries[]
  unit?: string | null
  isLoading: boolean
  rangeMinutes: number
  onRangeChange: (rangeMinutes: number) => void
  /** Bề rộng cửa sổ gộp mẫu do backend trả về — nói thẳng mỗi điểm đại diện cho bao lâu. */
  bucketSeconds?: number | null
}

export function WidgetChartDialog({
  open,
  onOpenChange,
  title,
  series,
  unit,
  isLoading,
  rangeMinutes,
  onRangeChange,
  bucketSeconds,
}: WidgetChartDialogProps) {
  const points = series.flatMap((item) => item.points).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  const summary = points.length > 1 ? stats(series) : null
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Rộng/cao gần hết màn hình: đây là chỗ người dùng vào để NHÌN KỸ, mọi pixel nhường cho
          khung vẽ. Chiều cao biểu đồ co theo modal chứ không đặt cứng. */}
      <DialogContent className="flex h-[94vh] w-[96vw] flex-col gap-4 sm:max-w-[1600px]">
        <DialogHeader>
          <DialogTitle className="truncate pr-8 uppercase tracking-wide">{title}</DialogTitle>
          <DialogDescription>
            {/* Nói rõ mỗi điểm là trung bình bao lâu: người đọc dễ tưởng đây là số đo thô và đi tìm
                một đỉnh nhọn mà cửa sổ gộp đã làm tù. */}
            {bucketSeconds
              ? `Mỗi điểm gộp ${Math.round(bucketSeconds / 60) || 1} phút. Cuộn để phóng, kéo để trượt.`
              : 'Cuộn để phóng, kéo để trượt.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-xs text-muted-foreground">
            {first && last && (
              <span className="tabular">
                {formatDateTime(first.measuredAt)} — {formatDateTime(last.measuredAt)}
              </span>
            )}
          </div>
          <RangePicker value={rangeMinutes} onChange={onRangeChange} variant="group" />
        </div>

        <div className="flex min-h-0 flex-1">
          {isLoading ? (
            <Skeleton className="w-full rounded-lg" />
          ) : (
            <TrendChart
              series={series}
              variant="axis"
              zoomable
              unit={unit}
              emptyLabel="Không có số đo nào trong khoảng này"
            />
          )}
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              Nhỏ nhất <span className="tabular font-medium text-foreground">{round(summary.min)}</span>
              {unit ? ` ${unit}` : ''}
            </span>
            <span>
              Lớn nhất <span className="tabular font-medium text-foreground">{round(summary.max)}</span>
              {unit ? ` ${unit}` : ''}
            </span>
            <span>
              Trung bình <span className="tabular font-medium text-foreground">{round(summary.avg)}</span>
              {unit ? ` ${unit}` : ''}
            </span>
            <span>
              Số điểm <span className="tabular font-medium text-foreground">{points.length}</span>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
