import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** ReactNode để trang chi tiết gắn được badge cạnh tiêu đề. */
  title: React.ReactNode
  /** ReactNode để trang gắn được kiểu chữ riêng (VD chuỗi tổ chức viết hoa ở trang Tổng quan). */
  description?: React.ReactNode
  /** Nút quay lại — chỉ dùng ở trang chi tiết (/:id), trang danh sách đã có breadcrumb. */
  backTo?: string
  backLabel?: string
  /** Nút hành động chính của trang (Tạo mới, Áp template...). */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backTo,
  backLabel = 'Quay lại',
  actions,
  className,
}: PageHeaderProps) {
  return (
    // items-center: nút hành động căn giữa theo chiều cao khối tiêu đề (title + mô tả),
    // không dính lên mép trên — khối trái cao 2 dòng nên căn start bị lệch rõ.
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {/* Nút quay lại nằm cùng hàng với tiêu đề: đứng riêng một dòng phía trên thì nó đẩy
            tiêu đề xuống và ăn mất một tầng chiều cao ở mọi trang chi tiết. */}
        {backTo && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 size-8 shrink-0 text-muted-foreground"
            asChild
          >
            <Link to={backTo}>
              <ChevronLeft />
              <span className="sr-only">{backLabel}</span>
            </Link>
          </Button>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-[65ch] text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
