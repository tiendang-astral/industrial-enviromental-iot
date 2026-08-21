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

/** Sparkline dùng cho GatewayDetailPage (card nhỏ, không trục) — LineWidget Dashboard
 * dùng buildAxisLineOption bên dưới, tập trung vào biểu đồ đầy đủ trục/mốc giá trị. */
export function buildSparklineOption(history: ReadingPoint[], palette: ChartPalette) {
  return {
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: false },
    xAxis: { type: 'category', show: false, data: history.map((p) => p.measuredAt) },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => value.toString(),
    },
    series: [lineSeries(history, palette, false)],
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
