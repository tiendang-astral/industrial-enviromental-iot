import { Badge } from '@/components/ui/badge'
import type { AlertStatus } from '@/types/alert'

/**
 * Tách khỏi `StatusBadge` dùng chung vì mã `ACTIVE` mang nghĩa NGƯỢC nhau ở hai chỗ: với tenant/
 * user nó là "đang hoạt động" (tốt, màu ok), với cảnh báo nó là "sự cố đang diễn ra" (xấu, màu
 * destructive). Nhét cả hai vào một bảng map thì một trong hai chỗ chắc chắn hiện sai màu.
 */
const ALERT_STATUS: Record<
  AlertStatus,
  { label: string; variant: 'destructive' | 'warning' | 'ok' | 'outline' }
> = {
  // Chưa đủ duration_seconds — đang đếm, chưa gửi cho ai.
  PENDING: { label: 'Đang theo dõi', variant: 'warning' },
  ACTIVE: { label: 'Đang cảnh báo', variant: 'destructive' },
  RECOVERED: { label: 'Đã phục hồi', variant: 'ok' },
  // Quy tắc bị tắt/xoá khi sự cố còn mở. Màu trung tính chứ không phải `ok`: nó KHÔNG phải
  // "đã hết", chỉ là không còn ai theo dõi — kết cục thật sự không ai biết.
  STALE: { label: 'Ngừng theo dõi', variant: 'outline' },
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const mapped = ALERT_STATUS[status]
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>
}
