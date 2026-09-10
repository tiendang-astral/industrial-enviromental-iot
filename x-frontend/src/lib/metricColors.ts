import type { CSSProperties } from 'react'
import type { ChartPalette } from '@/lib/echarts'

/**
 * Màu theo NHÓM chỉ số — bốn nhóm, không phải mười bảy màu.
 *
 * Bản trước rải mỗi chỉ số một hue trong sáu hue của `--chart-1..6`. Kết quả là một gateway chín
 * cảm biến ra chín hàng chín màu chia đều vòng màu: không hàng nào trung tính nên không hàng nào
 * nổi, và màu chẳng nói được gì ngoài "hàng này khác hàng kia".
 *
 * Ở đây màu MANG NGHĨA: nó nói cảm biến thuộc nhóm nghiệp vụ nào. Đọc lướt một bảng là thấy ngay
 * "trạm này đo ba khí, một vi khí hậu, hai điện" mà không cần đọc tên. Hai chỉ số cùng nhóm cùng
 * màu — đó là chủ ý, không phải va chạm.
 *
 * Nhóm điện năng cố tình KHÔNG có màu riêng: một bảng cần chỗ trung tính để ba màu kia còn nổi
 * lên được, và điện năng là nhóm ít khi phải liếc gấp nhất.
 */
export type MetricGroup = 'climate' | 'gas' | 'weather' | 'power'

const GROUP_OF: Record<string, MetricGroup> = {
  // vi khí hậu
  temperature: 'climate',
  humidity: 'climate',
  pressure: 'climate',
  pm25: 'climate',
  light: 'climate',
  // khí
  co2: 'gas',
  o2: 'gas',
  nh3: 'gas',
  h2s: 'gas',
  ch4: 'gas',
  co: 'gas',
  o3: 'gas',
  // thời tiết
  wind_speed: 'weather',
  wind_direction: 'weather',
  // điện năng
  voltage: 'power',
  current: 'power',
  power: 'power',
}

/**
 * Dùng lại token có sẵn trong `index.css` (đã có bản light lẫn dark) thay vì khai màu mới:
 * lam 218 · lục 158 · cam 38, ba hue cách xa nhau nhất trong sáu hue của bảng `--chart-*`.
 */
const GROUP_CHART_INDEX: Record<MetricGroup, number | null> = {
  climate: 1,
  gas: 6,
  weather: 4,
  power: null,
}

export function metricGroup(metricCode: string | null | undefined): MetricGroup | null {
  if (!metricCode) return null
  return GROUP_OF[metricCode] ?? null
}

/**
 * Màu để gán thẳng vào `style`. Tailwind sinh class theo chuỗi tĩnh nên `text-chart-${n}` không
 * tồn tại sau khi build — biến CSS là đường duy nhất truyền được màu động mà vẫn theo theme.
 *
 * `undefined` = giữ nguyên màu chữ đang có: chân chưa gán chỉ số, hoặc chỉ số mới thêm dưới DB mà
 * chưa xếp nhóm ở đây. Thà không màu còn hơn phát cho nó một màu tuỳ tiện rồi người đọc suy ra
 * một nhóm không có thật.
 */
export function metricColorVar(metricCode: string | null | undefined): string | undefined {
  const group = metricGroup(metricCode)
  if (group === null) return undefined
  const index = GROUP_CHART_INDEX[group]
  // Nhóm điện năng: màu chữ xám thường, vẫn đọc tốt mà không thêm một hue nữa vào bảng.
  return index === null ? 'var(--foreground-subtle)' : `var(--chart-${index})`
}

/**
 * Màu đường vẽ cho ECharts — canvas không đọc được `var(--...)` nên phải lấy giá trị đã resolve
 * theo theme từ bảng màu.
 */
export function metricSeriesColor(
  metricCode: string | null | undefined,
  palette: ChartPalette
): string | undefined {
  const group = metricGroup(metricCode)
  if (group === null) return undefined
  const index = GROUP_CHART_INDEX[group]
  return index === null ? palette.text : palette.series[index - 1]
}

/**
 * Chip mang màu nhóm: chữ đúng màu, nền và viền là chính màu đó pha loãng. Pha bằng `color-mix`
 * thay vì ghép chuỗi alpha — token dự án khai bằng `oklch()`, nối thêm "22" vào là ra màu hỏng.
 */
export function metricChipStyle(color: string): CSSProperties {
  return {
    color,
    backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
    borderColor: `color-mix(in oklab, ${color} 32%, transparent)`,
  }
}
