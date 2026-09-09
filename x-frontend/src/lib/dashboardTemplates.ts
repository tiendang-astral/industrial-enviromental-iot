import { GRID_COLS, widgetSizeSpec } from '@/lib/dashboardLayout'
import type { DashboardTemplate, Datastream, TemplateEntry, Widget, WidgetType } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

/**
 * Mẫu bố cục là HẰNG SỐ, không phải dữ liệu — không tenant nào sửa được, runtime không ghi vào,
 * nên nó nằm ở đây chứ không nằm trong bảng `dashboard_template` nữa (bảng đã drop ở V23).
 *
 * Mẫu chỉ khai *công thức* — "ô CO2 rộng 3 đứng đầu hàng" — chứ không trỏ tới kênh của ai. Việc
 * gán kênh thật xảy ra lúc áp mẫu, trong `buildTemplateWidgets` bên dưới.
 *
 * Bố cục theo HÀNG chứ không theo toạ độ tuyệt đối. Toạ độ tuyệt đối chỉ đúng khi mọi ô dựng được:
 * đơn vị thiếu một chỉ số là để lại đúng một lỗ giữa board. Khai theo hàng thì bỏ một ô chỉ làm
 * hàng đó co lại, cấu trúc dọc còn nguyên.
 */
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'basic',
    name: 'Giám sát cơ bản',
    description: 'Nhiệt độ, độ ẩm, CO2 và tình trạng thiết bị — đủ dùng cho đơn vị mới dựng',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'temperature', w: 3, h: 2 },
        { type: 'VALUE', metric: 'humidity', w: 3, h: 2 },
        { type: 'VALUE', metric: 'co2', w: 3, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'temperature', w: 6, h: 4 },
        { type: 'LINE', metric: 'humidity', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'co2', w: 6, h: 4 },
        { type: 'DEVICE_LIST', w: 6, h: 4 },
      ],
    ],
  },
  {
    id: 'barn',
    name: 'Môi trường chuồng trại',
    description: 'Vi khí hậu và khí sinh ra từ chất thải — NH3, H2S theo dõi cùng nhiệt ẩm',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'temperature', w: 3, h: 2 },
        { type: 'VALUE', metric: 'humidity', w: 3, h: 2 },
        { type: 'VALUE', metric: 'co2', w: 3, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'temperature', w: 6, h: 4 },
        { type: 'LINE', metric: 'humidity', w: 6, h: 4 },
      ],
      [
        { type: 'VALUE', metric: 'nh3', w: 4, h: 2 },
        { type: 'VALUE', metric: 'h2s', w: 4, h: 2 },
        { type: 'VALUE', metric: 'ch4', w: 4, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'nh3', w: 6, h: 4 },
        { type: 'LINE', metric: 'h2s', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'co2', w: 6, h: 4 },
        { type: 'DEVICE_LIST', w: 6, h: 4 },
      ],
    ],
  },
  {
    id: 'gas-safety',
    name: 'Khí độc & an toàn',
    description: 'Ô số đọc tức thời cho toàn bộ khí nguy hiểm, kèm xu hướng của ba khí cháy nổ',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'o2', w: 3, h: 2 },
        { type: 'VALUE', metric: 'co', w: 3, h: 2 },
        { type: 'VALUE', metric: 'ch4', w: 3, h: 2 },
      ],
      [
        { type: 'VALUE', metric: 'h2s', w: 4, h: 2 },
        { type: 'VALUE', metric: 'nh3', w: 4, h: 2 },
        { type: 'VALUE', metric: 'co2', w: 4, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'co', w: 4, h: 4 },
        { type: 'LINE', metric: 'h2s', w: 4, h: 4 },
        { type: 'LINE', metric: 'nh3', w: 4, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'ch4', w: 6, h: 4 },
        { type: 'DEVICE_LIST', w: 6, h: 4 },
      ],
    ],
  },
  {
    id: 'air-quality',
    name: 'Chất lượng không khí',
    description: 'Bụi mịn, ozon và khí nhà kính — thiên về xu hướng dài hạn hơn là số tức thời',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'pm25', w: 3, h: 2 },
        { type: 'VALUE', metric: 'co2', w: 3, h: 2 },
        { type: 'VALUE', metric: 'o3', w: 3, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'pm25', w: 6, h: 4 },
        { type: 'LINE', metric: 'co2', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'o3', w: 6, h: 4 },
        { type: 'LINE', metric: 'co', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'humidity', w: 6, h: 4 },
        { type: 'DEVICE_LIST', w: 6, h: 4 },
      ],
    ],
  },
  {
    id: 'weather',
    name: 'Thời tiết ngoài trời',
    description: 'Trạm khí tượng: nhiệt ẩm, áp suất, gió và ánh sáng',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'temperature', w: 3, h: 2 },
        { type: 'VALUE', metric: 'humidity', w: 3, h: 2 },
        { type: 'VALUE', metric: 'pressure', w: 3, h: 2 },
      ],
      [
        { type: 'VALUE', metric: 'wind_speed', w: 4, h: 2 },
        { type: 'VALUE', metric: 'wind_direction', w: 4, h: 2 },
        { type: 'VALUE', metric: 'light', w: 4, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'temperature', w: 6, h: 4 },
        { type: 'LINE', metric: 'humidity', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'pressure', w: 6, h: 4 },
        { type: 'LINE', metric: 'wind_speed', w: 6, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'light', w: 6, h: 4 },
        { type: 'DEVICE_LIST', w: 6, h: 4 },
      ],
    ],
  },
  {
    id: 'power',
    name: 'Điện năng',
    description: 'Công suất, điện áp và dòng điện của thiết bị đo điện',
    rows: [
      [
        { type: 'DEVICES_ONLINE', w: 3, h: 2 },
        { type: 'VALUE', metric: 'power', w: 3, h: 2 },
        { type: 'VALUE', metric: 'voltage', w: 3, h: 2 },
        { type: 'VALUE', metric: 'current', w: 3, h: 2 },
      ],
      [
        { type: 'LINE', metric: 'power', w: 8, h: 4 },
        { type: 'DEVICE_LIST', w: 4, h: 4 },
      ],
      [
        { type: 'LINE', metric: 'voltage', w: 6, h: 4 },
        { type: 'LINE', metric: 'current', w: 6, h: 4 },
      ],
    ],
  },
]

/** Widget không bind kênh nào — dựng được ở mọi đơn vị, nhưng một mình chúng thì chưa thành board. */
const NODE_SCOPED_TYPES: WidgetType[] = ['DEVICE_LIST', 'DEVICES_ONLINE']

const NODE_SCOPED_TITLE: Partial<Record<WidgetType, string>> = {
  DEVICE_LIST: 'Danh sách thiết bị',
  DEVICES_ONLINE: 'Thiết bị trực tuyến',
}

export interface TemplateBuildContext {
  /** Node đứng sau board — quyết định tiêu đề có cần tiền tố tên đơn vị con hay không. */
  boardNodeId: number
  /** Kênh trong phạm vi board (đã gồm đơn vị con). */
  datastreams: Datastream[]
  /** id -> {name, path} của cây đơn vị, để sắp kênh theo trật tự cây và đặt tiền tố tiêu đề. */
  nodeById: Map<number, { name: string; path: string }>
  metricByCode: Map<string, Metric>
  /** Board theo nguồn không có khái niệm gateway — bỏ hẳn widget theo đơn vị. */
  allowDeviceWidgets: boolean
}

export interface ResolvedTemplate {
  template: DashboardTemplate
  widgets: Widget[]
  /** Số ô thật sự bind được kênh — ô thiết bị dựng được ở mọi nơi nên không tính là "có dữ liệu". */
  boundCount: number
  /** Tỉ lệ ô bind được trên tổng số ô cần chỉ số của mẫu. */
  coverage: number
}

/**
 * Mẫu phải phủ được ít nhất nửa số chỉ số nó khai mới đáng gợi ý.
 *
 * Chỉ lọc "có ít nhất một ô" là quá dễ dãi: nguồn chỉ có CO2 vẫn thấy mẫu "Khí độc & an toàn" hiện
 * ra rồi dựng đúng MỘT ô số — mang tên một mẫu 10 ô. Mẫu sơ sài thì thà không gợi ý còn hơn.
 */
const MIN_COVERAGE = 0.5

/**
 * Dựng board từ mẫu. Bỏ hẳn ô không có kênh nào khớp thay vì để ô rỗng: một ô "—" không nói được
 * gì, mà lại chiếm đúng chỗ của thứ nói được.
 */
export function buildTemplateWidgets(template: DashboardTemplate, ctx: TemplateBuildContext): Widget[] {
  const rows = template.rows
    .map(
      (row) =>
        row
          .map((entry) => ({ entry, datastreams: resolveEntry(entry, ctx) }))
          .filter((item) => item.datastreams !== null) as ResolvedEntry[]
    )
    .filter((row) => row.length > 0)
  pullUpToFill(rows)

  const widgets: Widget[] = []
  let y = 0

  for (const resolved of rows) {
    if (resolved.length === 0) continue // hàng bị kéo rỗng ở bước lấp chỗ trống
    const widths = distributeWidths(resolved.map((item) => item.entry))
    let x = 0
    let rowHeight = 0
    resolved.forEach((item, index) => {
      const spec = widgetSizeSpec(item.entry.type)
      const w = widths[index]
      const h = Math.min(Math.max(item.entry.h, spec.minH), spec.maxH)
      // Hàng khai quá 12 cột (lỗi lúc soạn mẫu) thì xuống dòng thay vì tràn ra ngoài lưới.
      if (x + w > GRID_COLS) {
        y += rowHeight
        x = 0
        rowHeight = 0
      }
      widgets.push({
        id: crypto.randomUUID(),
        type: item.entry.type,
        layout: { x, y, w, h },
        title: entryTitle(item.entry, item.datastreams, ctx),
        binding: item.datastreams.length > 0 ? { datastreamIds: item.datastreams.map((ds) => ds.id) } : null,
        config: {},
      })
      x += w
      rowHeight = Math.max(rowHeight, h)
    })
    y += rowHeight
  }

  return widgets
}

/** Mẫu áp được ở đơn vị này, kèm bố cục đã dựng sẵn — hiện đúng những mẫu có dữ liệu để dựng. */
export function resolveTemplates(ctx: TemplateBuildContext): ResolvedTemplate[] {
  return DASHBOARD_TEMPLATES.map((template) => {
    const widgets = buildTemplateWidgets(template, ctx)
    const boundCount = widgets.filter((widget) => !NODE_SCOPED_TYPES.includes(widget.type)).length
    const declared = template.rows.flat().filter((entry) => entry.metric).length
    return { template, widgets, boundCount, coverage: declared === 0 ? 0 : boundCount / declared }
  }).filter((resolved) => resolved.boundCount > 0 && resolved.coverage >= MIN_COVERAGE)
}

type ResolvedEntry = { entry: TemplateEntry; datastreams: Datastream[] }

/**
 * Kéo ô của hàng dưới lên lấp chỗ trống của hàng trên.
 *
 * Giãn bề rộng (`distributeWidths`) không phải lúc nào cũng lấp kín: mọi ô đều có trần riêng, nên
 * một hàng còn đúng hai ô — VD hàng chỉ số của "Chất lượng không khí" khi đơn vị thiếu PM2.5 và O3
 * — chỉ nở tới 6+6 hoặc ít hơn rồi để lại một mảng trống giữa board.
 *
 * CHỈ kéo ô **cùng chiều cao**: ô cao hơn hoặc thấp hơn hàng đang xếp sẽ tạo ra khoảng hụt theo
 * chiều dọc — đổi một lỗ ngang lấy một lỗ dọc thì không được gì. Thứ tự đọc vẫn giữ nguyên vì chỉ
 * lấy từ đầu hàng kế tiếp.
 */
function pullUpToFill(rows: ResolvedEntry[][]): void {
  const width = (item: ResolvedEntry) => {
    const spec = widgetSizeSpec(item.entry.type)
    return Math.min(Math.max(item.entry.w, spec.minW), spec.maxW)
  }
  const height = (item: ResolvedEntry) => {
    const spec = widgetSizeSpec(item.entry.type)
    return Math.min(Math.max(item.entry.h, spec.minH), spec.maxH)
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length === 0) continue
    const rowHeight = Math.max(...rows[i].map(height))
    let used = rows[i].reduce((sum, item) => sum + width(item), 0)

    for (let j = i + 1; j < rows.length && used < GRID_COLS; j++) {
      while (rows[j].length > 0) {
        const candidate = rows[j][0]
        if (height(candidate) !== rowHeight || used + width(candidate) > GRID_COLS) break
        rows[i].push(candidate)
        rows[j].shift()
        used += width(candidate)
      }
      // Hàng kế tiếp còn ô không kéo lên được thì dừng hẳn: nhảy cóc qua nó để lấy hàng xa hơn là
      // đảo thứ tự đọc của mẫu.
      if (rows[j].length > 0) break
    }
  }
}

/** `null` = không dựng được ô này. Mảng rỗng = dựng được nhưng không bind kênh (widget theo đơn vị). */
function resolveEntry(entry: TemplateEntry, ctx: TemplateBuildContext): Datastream[] | null {
  if (NODE_SCOPED_TYPES.includes(entry.type)) {
    return ctx.allowDeviceWidgets ? [] : null
  }
  const matched = ctx.datastreams
    .filter((datastream) => datastream.metricCode === entry.metric)
    // Thứ tự cây tổ chức, không phải thứ tự id: hai ô cạnh nhau phải liệt kê đơn vị theo cùng một
    // trật tự, nếu không mắt phải dò lại tên ở từng ô.
    .sort((a, b) => {
      const pathA = ctx.nodeById.get(a.tenantNodeId)?.path ?? ''
      const pathB = ctx.nodeById.get(b.tenantNodeId)?.path ?? ''
      return pathA === pathB ? a.id - b.id : pathA.localeCompare(pathB)
    })
  return matched.length > 0 ? matched : null
}

/**
 * Giãn các ô còn lại cho kín 12 cột. Hàng khai 4 ô mà chỉ 2 chỉ số có kênh, nếu giữ nguyên bề rộng
 * thì nửa hàng bỏ trống — mà trần bề rộng của từng loại vẫn phải tôn trọng (ô số kéo hết board chỉ
 * tạo khoảng trắng quanh một con số).
 */
function distributeWidths(entries: TemplateEntry[]): number[] {
  const widths = entries.map((entry) => {
    const spec = widgetSizeSpec(entry.type)
    return Math.min(Math.max(entry.w, spec.minW), spec.maxW)
  })
  const maxWidths = entries.map((entry) => widgetSizeSpec(entry.type).maxW)

  let total = widths.reduce((sum, w) => sum + w, 0)
  // Chia lần lượt từng cột một thay vì nhân tỉ lệ — không sinh số lẻ phải làm tròn, và ô nào chạm
  // trần thì tự dừng nhận thêm. Chia XOAY VÒNG chứ không dồn cho ô đầu: dồn thì ô đầu phình tới
  // trần rồi mới tới lượt ô sau, ra một hàng ba ô lệch hẳn cỡ nhau dù mẫu khai bằng nhau.
  let cursor = 0
  while (total < GRID_COLS) {
    const index = widths.findIndex((_, offset) => {
      const i = (cursor + offset) % widths.length
      return widths[i] < maxWidths[i]
    })
    if (index === -1) break
    const target = (cursor + index) % widths.length
    widths[target] += 1
    total += 1
    cursor = target + 1
  }
  return widths
}

/**
 * Nhiều kênh thì không tên kênh nào đại diện được cho cả ô — dùng tên chỉ số. Một kênh thì giữ tên
 * kênh, kèm tiền tố đơn vị nếu nó thuộc đơn vị con của board.
 */
function entryTitle(entry: TemplateEntry, datastreams: Datastream[], ctx: TemplateBuildContext): string {
  if (datastreams.length === 0) {
    return NODE_SCOPED_TITLE[entry.type] ?? entry.type
  }
  if (datastreams.length > 1) {
    return ctx.metricByCode.get(entry.metric ?? '')?.name ?? entry.metric ?? ''
  }
  const [datastream] = datastreams
  if (datastream.tenantNodeId === ctx.boardNodeId) return datastream.name
  const nodeName = ctx.nodeById.get(datastream.tenantNodeId)?.name
  return nodeName ? `${nodeName} · ${datastream.name}` : datastream.name
}
