import type { ReadingPoint } from '@/types/telemetry'

export interface ChartPalette {
  line: string
  grid: string
  text: string
  /** Màu cho biểu đồ nhiều đường — `--chart-1..6` đã khai sẵn trong index.css. */
  series: string[]
}

/**
 * zrender chỉ phân tích được hex/rgb/hsl, còn token của dự án khai bằng `oklch()`. Canvas trình
 * duyệt vẽ được oklch nên đường nét hiện bình thường, NHƯNG khi hover ECharts tự dẫn xuất màu
 * nhấn: `states.js` gọi `liftColor(stroke)` → `zrender.lift()` → `undefined` với oklch, và nét
 * vẽ mất sạch màu đúng lúc trỏ chuột vào.
 *
 * Không dùng mẹo gán `fillStyle` rồi đọc lại: theo spec canvas, màu ngoài sRGB được trả về
 * NGUYÊN DẠNG, nên phép đó không đổi được gì. Phải vẽ thật một điểm ảnh rồi đọc byte RGBA —
 * bước rasterize mới là chỗ màu bị ép về sRGB, và nó đúng bất kể trình duyệt biểu diễn oklch
 * thế nào.
 */
function toParsableColor(value: string, fallback: string): string {
  if (!value) return fallback

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return fallback

  // Chuỗi trình duyệt không hiểu thì phép gán bị bỏ qua âm thầm, fillStyle giữ nguyên màu mồi.
  const primer = '#000000'
  context.fillStyle = primer
  context.fillStyle = value
  if (context.fillStyle === primer && value.toLowerCase().replace(/\s/g, '') !== primer) {
    return fallback
  }

  try {
    context.clearRect(0, 0, 1, 1)
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    if (a === 0) return fallback
    const hex = (channel: number) => channel.toString(16).padStart(2, '0')
    return a === 255 ? `#${hex(r)}${hex(g)}${hex(b)}` : `rgba(${r}, ${g}, ${b}, ${a / 255})`
  } catch {
    // getImageData có thể ném khi canvas bị coi là tainted — quay về màu dự phòng thay vì
    // trả chuỗi oklch mà zrender không đọc nổi.
    return fallback
  }
}

/**
 * ECharts vẽ lên canvas nên không đọc được `var(--...)` — phải resolve token thành giá trị
 * thật tại thời điểm build option. Trước đây không truyền màu nên chart dùng bảng màu mặc định
 * của ECharts, lệch hẳn khỏi hệ màu của app. Đọc lại mỗi lần đổi theme qua `useChartPalette`.
 */
export function resolveChartPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement)
  // Fallback phải là hex chứ không phải oklch: nếu chính nó cũng không parse được thì đường
  // dự phòng lại tái tạo đúng lỗi nó sinh ra để tránh.
  const read = (name: string, fallback: string) =>
    toParsableColor(style.getPropertyValue(name).trim(), fallback)
  const series = [1, 2, 3, 4, 5, 6].map((index) =>
    read(`--chart-${index}`, ['#2f86a6', '#6366f1', '#c2549d', '#d97706', '#16a34a', '#0891b2'][index - 1])
  )
  return {
    line: series[0],
    grid: read('--border', '#d7dce2'),
    text: read('--muted-foreground', '#6b7683'),
    series,
  }
}

function lineSeries(history: ReadingPoint[], palette: ChartPalette, showSymbol: boolean, color?: string, name?: string) {
  const stroke = color ?? palette.line
  return {
    name,
    type: 'line' as const,
    data: history.map((p) => p.value),
    showSymbol,
    symbolSize: 5,
    smooth: true,
    itemStyle: { color: stroke },
    lineStyle: { width: 2, color: stroke },
    areaStyle: { color: stroke, opacity: 0.1 },
    // Khai sẵn màu cho trạng thái nhấn. `echarts/lib/util/states.js` chỉ tự dẫn xuất màu
    // (`liftColor`) KHI emphasis chưa khai fill/stroke — mà phép dẫn xuất đó trả `undefined`
    // với màu ngoài sRGB, làm đường và vùng nền biến mất đúng lúc hover. Khai đủ ba lớp thì
    // ECharts không phải tự đoán, và nét vẽ an toàn với mọi định dạng màu.
    emphasis: {
      lineStyle: { width: 2.5, color: stroke },
      itemStyle: { color: stroke },
      areaStyle: { color: stroke, opacity: 0.16 },
    },
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
  now: number,
  /** Màu của chỉ số kênh này (xem `lib/metricColors.ts`). Bỏ trống thì dùng màu mặc định. */
  color?: string
) {
  // Cửa sổ đầy đủ là TRẦN chứ không phải khung cứng. Kênh mới bật chỉ có 1 giờ số đo mà vẫn trải
  // trục 12 giờ thì toàn bộ dữ liệu dồn vào ~8% bề ngang, thành một vệt dựng đứng đọc không ra.
  // Bắt đầu từ điểm đầu tiên khi dữ liệu chưa phủ hết — kênh chưa có số đo nào vẫn giữ khung đủ
  // mốc giờ theo đúng lý do ở trên.
  const windowStart = now - rangeMinutes * 60_000
  const firstPoint = history.length > 0 ? new Date(history[0].measuredAt).getTime() : windowStart

  return {
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'time',
      min: Math.max(windowStart, firstPoint),
      max: now,
      axisLine: { lineStyle: { color: palette.grid } },
      axisTick: { lineStyle: { color: palette.grid } },
      // Khung sparkline chỉ rộng vài trăm px: để ECharts tự chọn số mốc thì chúng đè lên nhau
      // thành một vệt. splitNumber giảm mật độ, hideOverlap bỏ nốt mốc nào vẫn còn chạm nhau.
      splitNumber: 4,
      axisLabel: {
        fontSize: 10,
        color: palette.text,
        hideOverlap: true,
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
        ...lineSeries(history, palette, false, color),
        // Trục thời gian cần cặp [mốc, giá trị]; mảng giá trị đơn thuần chỉ hợp với trục category.
        data: history.map((point) => [new Date(point.measuredAt).getTime(), point.value]),
      },
    ],
  }
}

/** Biểu đồ đầy đủ trục X/Y + mốc giá trị cho widget LINE trên Dashboard. */
const DAY_MS = 24 * 60 * 60 * 1000

/** Khoảng 7 ngày mà nhãn chỉ có "15:06" thì không biết là hôm nào — thêm ngày khi cần. */
function spansMultipleDays(history: ReadingPoint[]) {
  if (history.length < 2) return false
  const first = new Date(history[0].measuredAt).getTime()
  const last = new Date(history[history.length - 1].measuredAt).getTime()
  return last - first > DAY_MS
}

export function buildAxisLineOption(
  history: ReadingPoint[],
  unit: string | null | undefined,
  palette: ChartPalette,
  zoomable = false,
  /** Màu của chỉ số kênh này (xem `lib/metricColors.ts`). Bỏ trống thì dùng màu mặc định. */
  color?: string
) {
  const multiDay = spansMultipleDays(history)

  return {
    // Đơn vị in MỘT lần ở góc trên-trái khung vẽ thay vì lặp ở từng vạch — lặp thì mắt phải lọc
    // bỏ nó ở mọi dòng mới đọc được con số. Dùng `title` chứ không dùng `yAxis.name`: name neo vào
    // đường trục nên khi canh phải nó thò ra ngoài lưới và bị cắt mất phần đầu.
    title: unit
      ? {
          text: unit,
          left: 0,
          top: 0,
          textStyle: { fontSize: 10, color: palette.text, fontWeight: 'normal' as const },
        }
      : undefined,
    // Chừa đáy cho thanh trượt khi bật phóng — không chừa thì nó đè lên nhãn trục thời gian.
    grid: { left: 8, right: 12, top: unit ? 26 : 12, bottom: zoomable ? 44 : 8, containLabel: true },
    dataZoom: zoomable
      ? [
          // `inside` = cuộn để phóng, kéo để trượt ngay trên khung vẽ; `slider` để thấy đang đứng ở
          // đâu trong toàn dải và kéo lại bằng chuột.
          { type: 'inside', throttle: 50 },
          {
            type: 'slider',
            height: 22,
            bottom: 8,
            borderColor: palette.grid,
            // Không ghép chuỗi alpha vào màu: `toParsableColor` có thể trả `rgb(...)` chứ không
            // chắc là hex 6 ký tự, ghép '22' vào là ra màu hỏng.
            fillerColor: palette.grid,
            handleStyle: { color: palette.line },
            textStyle: { color: palette.text, fontSize: 10 },
          },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      data: history.map((p) => p.measuredAt),
      axisLine: { lineStyle: { color: palette.grid } },
      axisTick: { alignWithLabel: true, lineStyle: { color: palette.grid } },
      axisLabel: {
        fontSize: 10,
        color: palette.text,
        hideOverlap: true,
        formatter: (value: string) =>
          new Date(value).toLocaleString('vi-VN', {
            ...(multiDay ? { day: '2-digit', month: '2-digit' } : {}),
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        fontSize: 10,
        color: palette.text,
      },
      splitLine: { lineStyle: { type: 'dashed', color: palette.grid } },
    },
    tooltip: {
      trigger: 'axis',
      // Nhãn trục rút gọn cho gọn chỗ, còn tooltip phải nói đủ ngày-giờ-giây: đây là nơi người
      // dùng đối chiếu với log và với thời điểm sự cố.
      formatter: (params: unknown) => {
        const point = (Array.isArray(params) ? params[0] : params) as {
          axisValue: string
          data: number
        }
        const when = new Date(point.axisValue).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        return `${when}<br/><strong>${point.data}${unit ? ' ' + unit : ''}</strong>`
      },
    },
    series: [lineSeries(history, palette, history.length <= 30, color)],
  }
}

export interface ChartSeries {
  label: string
  points: ReadingPoint[]
}

/**
 * Biểu đồ nhiều đường cho widget bind nhiều kênh CÙNG chỉ số (cùng đơn vị — khác đơn vị thì không
 * chồng chung trục Y được, xem PLAN.md Phase 2).
 *
 * Trục X là HỢP các mốc thời gian của mọi kênh: backend gộp mẫu theo cùng cửa sổ nhưng bỏ bucket
 * rỗng (`createEmpty: false`), nên hai kênh cùng khoảng vẫn có thể lệch mốc. Chỗ thiếu để `null` và
 * `connectNulls` nối qua, thay vì đẩy dữ liệu lệch sang mốc của kênh khác.
 */
export function buildMultiLineOption(
  series: ChartSeries[],
  unit: string | null | undefined,
  palette: ChartPalette,
  zoomable = false
) {
  const axis = [...new Set(series.flatMap((s) => s.points.map((p) => p.measuredAt)))].sort()
  const showLegend = series.length > 1

  // Truyền trục thật vào để nhãn thời gian tự biết có bắc qua nhiều ngày hay không; `series` và
  // `xAxis.data` của base bị ghi đè ngay bên dưới.
  const base = buildAxisLineOption(
    axis.map((measuredAt) => ({ value: 0, measuredAt })), unit, palette, zoomable
  )
  return {
    ...base,
    legend: showLegend
      ? {
          type: 'scroll' as const,
          top: 0,
          left: unit ? 28 : 0,
          itemHeight: 8,
          itemWidth: 14,
          textStyle: { fontSize: 10, color: palette.text },
        }
      : undefined,
    grid: { ...base.grid, top: showLegend ? 28 : base.grid.top },
    xAxis: { ...base.xAxis, data: axis },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const rows = (Array.isArray(params) ? params : [params]) as {
          axisValue: string
          seriesName: string
          data: number | null
          color: string
        }[]
        if (rows.length === 0) return ''
        const when = new Date(rows[0].axisValue).toLocaleString('vi-VN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
        const lines = rows
          .filter((row) => row.data != null)
          .map((row) => `<span style="color:${row.color}">●</span> ${row.seriesName}: <strong>${row.data}${unit ? ' ' + unit : ''}</strong>`)
        return `${when}<br/>${lines.join('<br/>')}`
      },
    },
    series: series.map((item, index) => {
      const byTime = new Map(item.points.map((point) => [point.measuredAt, point.value]))
      const data = axis.map((measuredAt) => byTime.get(measuredAt) ?? null)
      return {
        ...lineSeries([], palette, false, palette.series[index % palette.series.length], item.label),
        data,
        connectNulls: true,
        // Nhiều đường chồng nhau mà tô nền thì lớp dưới bị che — chỉ tô khi có đúng một đường.
        areaStyle: showLegend ? undefined : lineSeries([], palette, false).areaStyle,
      }
    }),
  }
}
