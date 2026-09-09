import type { Widget, WidgetLayout, WidgetType } from '@/types/dashboard'

export const GRID_COLS = 12

export interface WidgetSizeSpec {
  minW: number
  maxW: number
  minH: number
  maxH: number
  /** Cỡ khi widget vừa được tạo — phải khớp `WidgetSizeSpec` ở x-backend (dùng khi áp mẫu). */
  w: number
  h: number
}

/**
 * Sàn/trần kích thước theo loại widget. Trần có mặt vì kéo một ô số to hết board chỉ tạo khoảng
 * trắng quanh một con số; sàn có mặt vì biểu đồ dưới 4 cột không còn chỗ ghi nhãn trục thời gian.
 */
export const WIDGET_SIZE_SPEC: Record<WidgetType, WidgetSizeSpec> = {
  VALUE: { minW: 2, maxW: 6, minH: 2, maxH: 4, w: 3, h: 2 },
  LINE: { minW: 4, maxW: 12, minH: 3, maxH: 8, w: 6, h: 4 },
  SWITCH: { minW: 2, maxW: 4, minH: 2, maxH: 2, w: 3, h: 2 },
  DEVICES_ONLINE: { minW: 2, maxW: 6, minH: 2, maxH: 3, w: 3, h: 2 },
  DEVICE_LIST: { minW: 3, maxW: 12, minH: 3, maxH: 8, w: 4, h: 4 },
}

export function widgetSizeSpec(type: WidgetType): WidgetSizeSpec {
  return WIDGET_SIZE_SPEC[type] ?? WIDGET_SIZE_SPEC.VALUE
}

/**
 * Board lưu trước khi có ràng buộc vẫn còn widget quá cỡ — kẹp lúc nạp để hiển thị đúng ngay, phần
 * ghi lại để dành tới lúc người dùng bấm Lưu (không tự sửa layout sau lưng họ).
 */
export function clampWidgetLayout(widget: Widget): Widget {
  const spec = widgetSizeSpec(widget.type)
  const w = Math.min(Math.max(widget.layout.w, spec.minW), spec.maxW)
  const h = Math.min(Math.max(widget.layout.h, spec.minH), spec.maxH)
  const x = Math.max(0, Math.min(widget.layout.x, GRID_COLS - w))
  const unchanged = w === widget.layout.w && h === widget.layout.h && x === widget.layout.x
  return unchanged ? widget : { ...widget, layout: { ...widget.layout, x, w, h } }
}

export function clampWidgets(widgets: Widget[]): Widget[] {
  return widgets.map(clampWidgetLayout)
}

function overlaps(a: WidgetLayout, b: WidgetLayout): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Ô trống ĐẦU TIÊN chứa vừa widget, quét từ trên xuống, trái sang phải.
 *
 * Bản trước suy vị trí từ "hàng cuối" nên khi các widget ở đáy cao thấp khác nhau, ô mới rơi trúng
 * chỗ đã có widget — RGL phải đẩy widget kia xuống, và với bố cục tự do thì nó không trồi lại.
 * Quét thật thì ô mới không bao giờ đụng ai, nên chẳng có gì để đẩy.
 */
export function nextWidgetLayout(existing: Widget[], type: WidgetType): WidgetLayout {
  const spec = widgetSizeSpec(type)
  const taken = existing.map((widget) => widget.layout)
  const bottom = taken.reduce((max, layout) => Math.max(max, layout.y + layout.h), 0)

  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x + spec.w <= GRID_COLS; x++) {
      const candidate = { x, y, w: spec.w, h: spec.h }
      if (!taken.some((layout) => overlaps(candidate, layout))) return candidate
    }
  }
  return { x: 0, y: bottom, w: spec.w, h: spec.h }
}
