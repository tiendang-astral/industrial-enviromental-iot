import type { PinType } from '@/types/gatewayPin'

/**
 * Mã chân của Advantech (`AI`/`DI`/`DO`/`AO`) là ký hiệu phần cứng, người vận hành ngoài hiện
 * trường không đọc ra nghĩa. Luôn hiển thị qua đây, đừng render thẳng mã ra giao diện.
 */
export const PIN_TYPE_LABEL: Record<PinType, string> = {
  AI: 'Đầu vào analog',
  DI: 'Đầu vào số',
  DO: 'Đầu ra số',
  AO: 'Đầu ra analog',
}

/** Chú thích ngắn cho từng loại chân — dùng ở tooltip/mô tả, không nhồi vào nhãn chính. */
export const PIN_TYPE_HINT: Record<PinType, string> = {
  AI: 'Đọc giá trị liên tục từ cảm biến (nhiệt độ, độ ẩm...)',
  DI: 'Đọc trạng thái bật/tắt từ thiết bị (công tắc, cảm biến cửa...)',
  DO: 'Đóng/ngắt relay để điều khiển thiết bị',
  AO: 'Xuất tín hiệu analog để điều khiển thiết bị',
}

/** VD: `Đầu vào analog · chân số 1` — thay cho `AI · Chân 1`. */
export function pinLabel(type: PinType, pinNumber: number) {
  return `${PIN_TYPE_LABEL[type]} · chân số ${pinNumber}`
}
