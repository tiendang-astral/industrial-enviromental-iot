/** Khớp `app.device.online-threshold-minutes` mặc định ở backend (5'). */
export const ONLINE_THRESHOLD_MINUTES = 5

export function isGatewayOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MINUTES * 60000
}

/**
 * Số đo còn "sống" hay không, dùng chung ngưỡng với gateway: hai chỗ nói về cùng một thiết bị mà
 * mỗi chỗ một con số thì sẽ có lúc thiết bị hiện "trực tuyến" trong khi kênh của nó báo đã nguội.
 */
export function isReadingLive(measuredAt: string | null | undefined) {
  if (!measuredAt) return false
  return Date.now() - new Date(measuredAt).getTime() < ONLINE_THRESHOLD_MINUTES * 60000
}
