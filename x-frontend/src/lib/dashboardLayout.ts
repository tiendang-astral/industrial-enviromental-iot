import type { Widget, WidgetLayout } from '@/types/dashboard'

const GRID_COLS = 12
const WIDGET_W = 4
const WIDGET_H = 3
const COLS_PER_ROW = GRID_COLS / WIDGET_W

/** Khớp logic xếp lưới của DashboardTemplateServiceImpl (backend) khi apply-template. */
export function nextWidgetLayout(existing: Widget[]): WidgetLayout {
  const startY = existing.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0)
  const index = existing.length
  const col = index % COLS_PER_ROW
  const row = Math.floor(index / COLS_PER_ROW)
  return { x: col * WIDGET_W, y: startY + row * WIDGET_H, w: WIDGET_W, h: WIDGET_H }
}
