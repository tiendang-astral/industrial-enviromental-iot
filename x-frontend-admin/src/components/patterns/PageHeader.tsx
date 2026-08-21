import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
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
    <div className={cn('flex flex-col gap-3', className)}>
      {backTo && (
        <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
          <Link to={backTo}>
            <ChevronLeft data-icon="inline-start" />
            {backLabel}
          </Link>
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="max-w-[65ch] text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
