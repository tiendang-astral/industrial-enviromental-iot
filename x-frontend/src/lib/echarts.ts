import type { ReadingPoint } from '@/types/telemetry'

export interface ChartPalette {
  line: string
  grid: string
  text: string
}

/**
 * ECharts vẽ lên canvas nên không đọc được `var(--...)` — phải resolve token thành giá trị
 * thật tại thời điểm build option. Trước đây không truyền màu nên chart dùng bảng màu mặc định
 * của ECharts, lệch hẳn khỏi hệ màu của app. Đọc lại mỗi lần đổi theme qua `useChartPalette`.
 */
export function resolveChartPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    line: read('--chart-1', 'oklch(0.58 0.13 200)'),
    grid: read('--border', 'oklch(0.902 0.008 250)'),
    text: read('--muted-foreground', 'oklch(0.49 0.02 250)'),
  }
}

function lineSeries(history: ReadingPoint[], palette: ChartPalette, showSymbol: boolean) {
  return {
    type: 'line' as const,
    data: history.map((p) => p.value),
    showSymbol,
    symbolSize: 5,
    smooth: true,
    itemStyle: { color: palette.line },
    lineStyle: { width: 2, color: palette.line },
    areaStyle: { color: palette.line, opacity: 0.1 },
  }
}

/**
 * Đường xu hướng trên card pin: chỉ hiện trục thời gian, `min`/`max` cố định theo khoảng đang xem.
 * Nhờ trục cố định, pin chưa có dữ liệu vẫn vẽ ra khung có mốc giờ chạy hết cả ngày — nhìn ra ngay
 * là "chưa có số liệu", chứ không phải một vùng trắng trông như lỗi render. Cũng nhờ vậy card
 * không nhảy layout khi điểm dữ liệu đầu tiên về.
 */
export function buildPinTrendOption(
  history: ReadingPoint[],
  palette: ChartPalette,
  rangeMinutes: number,
  now: number
) {
  return {
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'time',
      min: now - rangeMinutes * 60_000,
      max: now,
      axisLine: { lineStyle: { color: palette.grid } },
      axisTick: { lineStyle: { color: palette.grid } },
      axisLabel: {
        fontSize: 10,
        color: palette.text,
        /*
         * Cửa sổ 24h trượt luôn vắt qua nửa đêm, nên nếu mốc nào cũng chỉ có `HH:mm` thì trục đọc
         * ra như chạy ngược (16:00 → 12:00) — không có gì cho biết 16:00 là của hôm qua. Mốc rơi
         * đúng 00:00 vì vậy hiện ngày thay cho giờ, đánh dấu chỗ sang ngày mới.
         */
        formatter: (value: number) => {
          const at = new Date(value)
          return at.getHours() === 0 && at.getMinutes() === 0
            ? at.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            : at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        },
      },
    },
    // Ẩn trục giá trị: giá trị hiện tại đã in to ngay bên trái biểu đồ, dựng thêm một cột số nữa
    // chỉ ăn mất bề ngang vốn đã hẹp. `scale: true` để đường vẫn trải hết chiều cao.
    yAxis: { type: 'value', scale: true, show: false },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => value.toString(),
    },
    series: [
      {
        ...lineSeries(history, palette, false),
        // Trục thời gian cần cặp [mốc, giá trị]; mảng giá trị đơn thuần chỉ hợp với trục category.
        data: history.map((point) => [new Date(point.measuredAt).getTime(), point.value]),
      },
    ],
  }
}

/** Biểu đồ đầy đủ trục X/Y + mốc giá trị cho widget LINE trên Dashboard. */
export function buildAxisLineOption(
  history: ReadingPoint[],
  unit: string | null | undefined,
  palette: ChartPalette
) {
  return {
    grid: { left: 8, right: 12, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: history.map((p) => p.measuredAt),
      axisLine: { lineStyle: { color: palette.grid } },
      axisTick: { alignWithLabel: true, lineStyle: { color: palette.grid } },
      axisLabel: {
        fontSize: 10,
        color: palette.text,
        formatter: (value: string) =>
          new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        fontSize: 10,
        color: palette.text,
        formatter: unit ? `{value} ${unit}` : undefined,
      },
      splitLine: { lineStyle: { type: 'dashed', color: palette.grid } },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value}${unit ? ' ' + unit : ''}`,
    },
    series: [lineSeries(history, palette, history.length <= 30)],
  }
}
