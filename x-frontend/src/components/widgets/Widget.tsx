import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface WidgetRootProps {
  children: ReactNode
  /** `muted` = widget điều khiển (SWITCH) — khác tông với widget chỉ đọc khi lướt mắt cả board. */
  tone?: 'card' | 'muted'
  /** Viền trái nhấn nhóm widget tổng hợp theo đơn vị (DEVICE_LIST/DEVICES_ONLINE). */
  accent?: 'none' | 'info'
  className?: string
}

function WidgetRoot({ children, tone = 'card', accent = 'none', className }: WidgetRootProps) {
  return (
    <div
      className={cn(
        'relative flex size-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border p-4',
        tone === 'muted' ? 'bg-muted' : 'bg-card',
        accent === 'info' && 'border-l-3 border-l-info',
        className
      )}
    >
      {children}
    </div>
  )
}

interface WidgetHeaderProps {
  title: string
  badge?: ReactNode
  /** Điều khiển của riêng widget (chọn khoảng, phóng to) — đứng sau badge. */
  actions?: ReactNode
}

// Không có icon: 5 loại widget chia nhau 3 icon chung chung thì icon không phân biệt được gì, chỉ
// ăn chỗ của tên kênh. Phân biệt loại bằng nền/viền/bố cục ở từng widget cụ thể.
function WidgetHeader({ title, badge, actions }: WidgetHeaderProps) {
  return (
    <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
      {/* Viết hoa: tiêu đề widget là NHÃN của ô số chứ không phải một câu, và dạng nhãn cũng tách
          nó khỏi chính con số bên dưới mà không cần thêm đường kẻ hay màu. */}
      <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide">{title}</p>
      {badge}
      {actions}
    </div>
  )
}

function WidgetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden', className)}>
      {children}
    </div>
  )
}

// Không có tông 'ok': vạch xanh dưới mọi widget bình thường là nhiễu, mắt sẽ học cách bỏ qua nó và
// mất luôn tác dụng cảnh báo. Chỉ vẽ khi có chuyện.
type StatusTone = 'warning' | 'critical'

const STATUS_BAR_CLASS: Record<StatusTone, string> = {
  warning: 'bg-warning',
  critical: 'bg-critical',
}

/** Vạch sát đáy card — đọc được trạng thái cả board mà không cần đọc từng con số. */
function WidgetStatusBar({ tone }: { tone: StatusTone }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-[3px] transition-colors duration-(--motion-base)',
        STATUS_BAR_CLASS[tone]
      )}
    />
  )
}

/** Compound component cho widget Dashboard (VD: <Widget><Widget.Header .../><Widget.Body>...</Widget.Body></Widget>). */
export const Widget = Object.assign(WidgetRoot, {
  Header: WidgetHeader,
  Body: WidgetBody,
  StatusBar: WidgetStatusBar,
})
