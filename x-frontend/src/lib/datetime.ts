/** Định dạng ngày giờ dùng chung cho bảng/thẻ thông tin. Trả '—' khi chưa có mốc thời gian. */
export function formatDateTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString('vi-VN') : '—'
}

/** Khoảng cách tới hiện tại, dạng người đọc ("3 phút trước"). Dùng cho cột "cập nhật gần nhất". */
export function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} giờ trước`
  return `${Math.floor(diffMinutes / 1440)} ngày trước`
}

/** Giờ:phút:giây từ epoch ms — dùng cho mốc "dữ liệu mới nhất" ở footer. */
export function formatClock(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN') : '—'
}
