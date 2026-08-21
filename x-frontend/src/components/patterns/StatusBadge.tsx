import { Badge } from '@/components/ui/badge'

type BadgeVariant = React.ComponentProps<typeof Badge>['variant']

/**
 * Một nguồn duy nhất map mã trạng thái backend → nhãn tiếng Việt + màu semantic.
 * Trước đây mỗi trang tự render `<Badge>{status}</Badge>` nên UI hiện chữ hoa tiếng Anh
 * (ACTIVE/LOCKED) lẫn giữa giao diện tiếng Việt, và mỗi nơi chọn màu một kiểu.
 */
const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  // tenant / tenant_user / platform_user
  ACTIVE: { label: 'Đang hoạt động', variant: 'ok' },
  LOCKED: { label: 'Đã khóa', variant: 'destructive' },
  // external_source_job.last_run_status
  RUNNING: { label: 'Đang chạy', variant: 'secondary' },
  SUCCESS: { label: 'Thành công', variant: 'ok' },
  FAILED: { label: 'Thất bại', variant: 'destructive' },
  // command.status
  PENDING: { label: 'Chờ xử lý', variant: 'secondary' },
  DISPATCHED: { label: 'Đã gửi', variant: 'secondary' },
  ACKNOWLEDGED: { label: 'Đã xác nhận', variant: 'ok' },
  TIMED_OUT: { label: 'Quá hạn', variant: 'warning' },
  // alert.status
  RECOVERED: { label: 'Đã phục hồi', variant: 'ok' },
  // alert.severity
  WARNING: { label: 'Cảnh báo', variant: 'warning' },
  CRITICAL: { label: 'Nguy hiểm', variant: 'destructive' },
  // trạng thái suy ra ở FE (gateway online, pin enabled...)
  ONLINE: { label: 'Trực tuyến', variant: 'ok' },
  OFFLINE: { label: 'Mất kết nối', variant: 'outline' },
  ENABLED: { label: 'Đang bật', variant: 'ok' },
  DISABLED: { label: 'Đã tắt', variant: 'outline' },
}

interface StatusBadgeProps {
  status: string
  /** Ghi đè nhãn khi ngữ cảnh cần chữ khác (VD "Pin đã tắt" thay vì "Đã tắt"). */
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status]
  return (
    <Badge variant={mapped?.variant ?? 'outline'} className={className}>
      {label ?? mapped?.label ?? status}
    </Badge>
  )
}
