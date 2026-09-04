import { cn } from '@/lib/utils'

export interface WizardStep {
  title: string
  description: string
}

/** Chỉ báo bước cho form nhiều bước — dùng chung giữa dialog thêm và sửa nguồn. */
export function StepBar({ steps, step }: { steps: readonly WizardStep[]; step: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((item, index) => (
        <div key={item.title} className="flex items-center gap-2">
          <span
            className={cn(
              'tabular flex size-5 items-center justify-center rounded-full text-[11px] font-medium',
              index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {index + 1}
          </span>
          <span className={cn('text-xs', index === step ? 'font-medium' : 'text-muted-foreground')}>
            {item.title}
          </span>
          {index < steps.length - 1 && <span className="h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  )
}
