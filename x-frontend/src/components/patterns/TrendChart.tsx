import { useCallback, useMemo, useState } from 'react'
import { ResizableChart } from '@/components/widgets/ResizableChart'
import { useChartPalette } from '@/hooks/useChartPalette'
import { downsampleReadings } from '@/lib/downsample'
import { metricSeriesColor } from '@/lib/metricColors'
import { buildAxisLineOption, buildMultiLineOption, buildPinTrendOption, type ChartSeries } from '@/lib/echarts'
import { cn } from '@/lib/utils'
import type { ReadingPoint } from '@/types/telemetry'

/**
 * Ngân sách điểm tính theo bề ngang thật chứ không đặt một con số cố định: cùng một component
 * chạy trong sparkline 230px lẫn widget dashboard kéo giãn được, một trần chung sẽ vừa cho cái
 * này thì thừa cho cái kia.
 *
 * Hai biến thể chịu mật độ khác nhau vì trả lời hai câu hỏi khác nhau. Sparkline cao 64px chỉ để
 * nói "đang đi lên hay đi xuống" — với dữ liệu nhiễu, vẽ dày thì các nhịp dính thành một dải đặc
 * và câu trả lời đó biến mất. Biểu đồ có trục là để đọc "lúc nào bao nhiêu", cần chi tiết hơn.
 */
const PX_PER_POINT = { sparkline: 9, axis: 4 } as const
const MIN_POINTS = { sparkline: 12, axis: 30 } as const
const MAX_POINTS = 400
/** Trước lần đo đầu tiên: đủ thưa để lần vẽ đầu không chi chít, rồi ResizeObserver chỉnh lại. */
const INITIAL_WIDTH = 240

/**
 * Một chỗ duy nhất dựng biểu đồ đường: lấy màu theo theme, thưa bớt điểm theo khung, tự resize,
 * và tự lo trạng thái chưa đủ dữ liệu. Trước đây ba nơi gọi thẳng ReactECharts mỗi nơi một kiểu
 * nên mỗi lần đổi luật hiển thị phải sửa cả ba.
 */
export function TrendChart({
  history = [],
  series,
  variant,
  unit,
  rangeMinutes,
  now,
  zoomable = false,
  metricCode,
  className,
  emptyLabel = 'Chưa đủ số đo để vẽ biểu đồ',
}: {
  /** Một chuỗi — dùng cho `sparkline` và cho nơi chỉ vẽ một kênh. */
  history?: ReadingPoint[]
  /** Nhiều chuỗi (widget bind nhiều kênh cùng chỉ số). Có `series` thì `history` bị bỏ qua. */
  series?: ChartSeries[]
  /** `sparkline` = chỉ trục thời gian, dùng trong card. `axis` = đủ trục X/Y cho widget. */
  variant: 'sparkline' | 'axis'
  /**
   * Cuộn để phóng, kéo để trượt. Chỉ dùng ở khung xem lớn: phóng KHÔNG tải thêm chi tiết (backend
   * đã gộp mẫu xuống ≤500 điểm/khoảng), nó chỉ giãn chuỗi đang có ra cho dễ đọc.
   */
  zoomable?: boolean
  /**
   * Mã chỉ số của kênh — biểu đồ MỘT chuỗi lấy theo đó ra màu riêng của chỉ số (xem
   * `lib/metricColors.ts`). Biểu đồ nhiều chuỗi bỏ qua: các chuỗi ở đó cùng một chỉ số nên tô
   * cùng màu là mất luôn khả năng phân biệt chúng.
   *
   * Nhận mã chứ không nhận màu: màu phải là hex đã resolve theo theme mới vẽ được lên canvas, mà
   * bảng màu đó chỉ có ở đây. Bắt mỗi nơi gọi tự đi lấy `useChartPalette` là nhân bản việc đó ra
   * khắp nơi.
   */
  metricCode?: string | null
  unit?: string | null
  /** Bắt buộc với `sparkline`: trục X cố định theo khoảng đang xem, không co theo dữ liệu. */
  rangeMinutes?: number
  /** Mốc "bây giờ" truyền từ ngoài để nhiều biểu đồ cạnh nhau dùng chung một trục. */
  now?: number
  className?: string
  emptyLabel?: string
}) {
  const palette = useChartPalette()
  const color = metricSeriesColor(metricCode, palette)
  const [width, setWidth] = useState(INITIAL_WIDTH)

  // Làm tròn xuống bội số 40px: kéo giãn widget không dựng lại option ở từng pixel một.
  const handleWidth = useCallback((next: number) => {
    setWidth(Math.max(Math.round(next / 40) * 40, 40))
  }, [])

  // Ngân sách điểm chia đều cho các chuỗi: 5 kênh mà mỗi kênh vẫn lấy trọn ngân sách thì tổng số
  // điểm phải vẽ tăng gấp 5, và khung hẹp lại thành một dải đặc.
  const option = useMemo(() => {
    const budget = Math.min(
      Math.max(Math.floor(width / PX_PER_POINT[variant]), MIN_POINTS[variant]),
      MAX_POINTS
    )
    if (series) {
      const perSeries = Math.max(Math.floor(budget / Math.max(series.length, 1)), MIN_POINTS[variant])
      return buildMultiLineOption(
        series.map((item) => ({ ...item, points: downsampleReadings(item.points, perSeries) })),
        unit,
        palette,
        zoomable
      )
    }
    const points = downsampleReadings(history, budget)
    return variant === 'sparkline'
      ? buildPinTrendOption(points, palette, rangeMinutes ?? 60, now ?? Date.now(), color)
      : buildAxisLineOption(points, unit, palette, zoomable, color)
    // `now` cố tình không nằm trong deps: nó đổi mỗi lần render và sẽ dựng lại option liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, series, palette, variant, unit, rangeMinutes, width, zoomable, color])

  const hasData = series ? series.some((item) => item.points.length > 1) : history.length > 1
  if (!hasData) {
    return (
      <div
        className={cn(
          'flex min-h-0 flex-1 items-center text-[11.5px] text-muted-foreground',
          variant === 'axis' && 'justify-center text-xs'
        )}
      >
        {emptyLabel}
      </div>
    )
  }

  return <ResizableChart option={option} className={className} onWidthChange={handleWidth} />
}
