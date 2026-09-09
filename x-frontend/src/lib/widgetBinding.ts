import type { Widget } from '@/types/dashboard'

/**
 * Một chỗ duy nhất hiểu cả hai thế hệ dữ liệu trong `layout_json`: board lưu trước khi có widget đa
 * kênh dùng `datastreamId` số ít, board mới dùng `datastreamIds`. Đọc thẳng `binding.datastreamId`
 * ở nơi khác là làm mọi board cũ mất widget.
 */
export function widgetDatastreamIds(widget: Pick<Widget, 'binding'>): number[] {
  const binding = widget.binding
  if (!binding) return []
  if (binding.datastreamIds?.length) return binding.datastreamIds
  return binding.datastreamId != null ? [binding.datastreamId] : []
}

/** Kênh đầu tiên — dùng cho widget vốn chỉ hiển thị một nguồn (tiêu đề, đơn vị đại diện). */
export function firstDatastreamId(widget: Pick<Widget, 'binding'>): number | undefined {
  return widgetDatastreamIds(widget)[0]
}
