import type { ReadingPoint } from '@/types/telemetry'

/** Sparkline dùng cho GatewayDetailPage (card nhỏ, không trục) — LineWidget Dashboard
 * dùng buildAxisLineOption bên dưới, tập trung vào biểu đồ đầy đủ trục/mốc giá trị. */
export function buildSparklineOption(history: ReadingPoint[]) {
  return {
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: false },
    xAxis: { type: 'category', show: false, data: history.map((p) => p.measuredAt) },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => value.toString(),
    },
    series: [
      {
        type: 'line',
        data: history.map((p) => p.value),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
      },
    ],
  }
}

/** Biểu đồ đầy đủ trục X/Y + mốc giá trị cho widget LINE trên Dashboard. */
export function buildAxisLineOption(history: ReadingPoint[], unit?: string | null) {
  return {
    grid: { left: 8, right: 12, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: history.map((p) => p.measuredAt),
      axisLabel: {
        fontSize: 10,
        formatter: (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { fontSize: 10, formatter: unit ? `{value} ${unit}` : undefined },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value}${unit ? ' ' + unit : ''}`,
    },
    series: [
      {
        type: 'line',
        data: history.map((p) => p.value),
        showSymbol: history.length <= 30,
        symbolSize: 5,
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
      },
    ],
  }
}
