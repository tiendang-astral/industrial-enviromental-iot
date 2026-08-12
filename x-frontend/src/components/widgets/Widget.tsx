import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface WidgetRootProps {
  children: ReactNode
  className?: string
}

function WidgetRoot({ children, className }: WidgetRootProps) {
  return (
    <div
      className={cn(
        'flex size-full min-w-0 min-h-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      {children}
    </div>
  )
}

function WidgetHeader({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
      {badge}
    </div>
  )
}

function WidgetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden', className)}>{children}</div>
}

/** Compound component cho widget Dashboard (VD: <Widget><Widget.Header .../><Widget.Body>...</Widget.Body></Widget>). */
export const Widget = Object.assign(WidgetRoot, { Header: WidgetHeader, Body: WidgetBody })
