import type { LucideIcon } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** CTA để người dùng biết cách tạo dữ liệu đầu tiên — trạng thái rỗng không có lối đi tiếp là bế tắc. */
  action?: React.ReactNode
  /**
   * `lg` cho khối rỗng chiếm trọn chiều cao trang (VD trang Báo cáo trước khi tạo): cỡ mặc định
   * hợp với ô rỗng trong bảng, đặt giữa một vùng cao 700px thì icon và chữ nhỏ như hạt bụi.
   */
  size?: 'default' | 'lg'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  const large = size === 'lg'
  return (
    <Empty className={cn(large && 'gap-6', className)}>
      <EmptyHeader className={cn(large && 'gap-3')}>
        {Icon && (
          <EmptyMedia
            variant="icon"
            className={cn(large && "size-16 rounded-2xl [&_svg:not([class*='size-'])]:size-8")}
          >
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle className={cn(large && 'text-lg')}>{title}</EmptyTitle>
        {description && (
          <EmptyDescription className={cn(large && 'text-base')}>{description}</EmptyDescription>
        )}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
