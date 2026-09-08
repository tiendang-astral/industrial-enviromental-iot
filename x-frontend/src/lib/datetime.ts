/** Định dạng ngày giờ dùng chung cho bảng/thẻ thông tin. Trả '—' khi chưa có mốc thời gian. */
export function formatDateTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString('vi-VN') : '—'
}

/** Chỉ ngày, không kèm giờ — dùng cho ô chọn ngày. */
export function formatDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'
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

/** Chỉ giờ:phút:giây từ mốc ISO — widget realtime chỉ cần giờ, ngày là thừa với số đo vừa về. */
export function formatTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleTimeString('vi-VN') : '—'
}

/** Giờ:phút:giây từ epoch ms — dùng cho mốc "dữ liệu mới nhất" ở footer. */
export function formatClock(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN') : '—'
}

/**
 * Khoảng cách TỚI một mốc trong tương lai ("sau 2 phút"). `formatRelativeTime` chỉ đúng cho quá
 * khứ: mốc tương lai cho hiệu số âm và rơi vào nhánh "Vừa xong", đọc ra vô nghĩa.
 */
export function formatCountdown(iso: string | null | undefined) {
  if (!iso) return '—'
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (diffSeconds <= 0) return 'ngay bây giờ'
  if (diffSeconds < 60) return `sau ${diffSeconds} giây`
  const minutes = Math.round(diffSeconds / 60)
  if (minutes < 60) return `sau ${minutes} phút`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `sau ${hours} giờ`
  return `sau ${Math.round(hours / 24)} ngày`
}
