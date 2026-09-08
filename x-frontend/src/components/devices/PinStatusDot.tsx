import { cn } from '@/lib/utils'
import { pinHealth, type PinHealth, type PinView } from '@/lib/gatewayPinView'

/**
 * Chấm trạng thái đầu mỗi hàng chân — cột quét mắt nhanh nhất để tìm chân có vấn đề.
 *
 * Đặc = biết chắc, rỗng = chưa biết, nét đứt = cố ý tắt. Nhãn đi kèm dạng `sr-only` vì màu không
 * bao giờ được là kênh thông tin duy nhất.
 */
const HEALTH: Record<PinHealth, { className: string; label: string }> = {
  online: {
    className: 'bg-ok shadow-[0_0_9px_color-mix(in_oklab,var(--ok)_70%,transparent)]',
    label: 'Đang chạy',
  },
  critical: {
    className: 'bg-critical shadow-[0_0_9px_color-mix(in_oklab,var(--critical)_70%,transparent)]',
    label: 'Ngoài ngưỡng',
  },
  // Rỗng, không phát sáng: không có gì đang chạy để mà sáng.
  offline: { className: 'border border-border', label: 'Chưa có số đo' },
  // Nét đứt tách hẳn "tự mình tắt" khỏi "mất tín hiệu" — hai việc cần xử lý khác nhau.
  disabled: { className: 'border border-dashed border-muted-foreground/60', label: 'Chân đã tắt' },
}

export function PinStatusDot({ view, gatewayOnline }: { view: PinView; gatewayOnline: boolean }) {
  const { className, label } = HEALTH[pinHealth(view, gatewayOnline)]
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <span className={cn('size-2.5 rounded-full', className)} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
