import { cn } from '@/lib/utils'
import type { WidgetType } from '@/types/dashboard'

/**
 * Phác thảo hình dáng của từng loại widget cho ô chọn loại. Thay cho dòng mô tả bằng chữ: hình dáng
 * nói được "ô này trông thế nào trên board" nhanh hơn một câu, và không ăn hai dòng ở mỗi ô.
 */
export function WidgetTypePreview({ type, selected }: { type: WidgetType; selected: boolean }) {
  const ink = selected ? 'bg-primary' : 'bg-muted-foreground/40'
  const text = selected ? 'text-primary' : 'text-muted-foreground'

  return (
    <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/30 px-2">
      {type === 'VALUE' && (
        <span className={cn('text-xl font-semibold tabular', text)}>
          28<span className="ml-0.5 align-top text-[9px] font-normal">°C</span>
        </span>
      )}

      {type === 'LINE' && (
        // polyline đơn giản thay vì các thanh CSS — đường gấp khúc là thứ duy nhất nói "biểu đồ".
        <svg viewBox="0 0 64 20" className="h-6 w-full" preserveAspectRatio="none" aria-hidden>
          <polyline
            points="0,15 10,11 20,13 30,5 40,8 52,2 64,6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={text}
          />
        </svg>
      )}

      {type === 'DEVICE_LIST' && (
        <div className="flex w-full flex-col gap-1">
          {[10, 8, 6].map((width, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className={cn('size-1.5 shrink-0 rounded-full', index === 2 ? 'bg-muted-foreground/30' : 'bg-ok')} />
              <span className={cn('h-1 rounded-full', ink)} style={{ width: `${width * 6}%` }} />
            </div>
          ))}
        </div>
      )}

      {type === 'DEVICES_ONLINE' && (
        <div className="flex w-full items-stretch gap-1.5">
          <div className="flex flex-1 flex-col items-center rounded bg-ok/10 py-1">
            <span className="text-sm font-semibold tabular text-ok">4</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded bg-destructive/10 py-1">
            <span className="text-sm font-semibold tabular text-destructive">1</span>
          </div>
        </div>
      )}

      {type === 'SWITCH' && (
        <span
          className={cn(
            'flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
            selected ? 'justify-end bg-primary' : 'justify-end bg-muted-foreground/30'
          )}
        >
          <span className="size-4 rounded-full bg-background" />
        </span>
      )}
    </div>
  )
}

/** Widget bind vào cái gì — thứ người dùng thật sự cần biết khi chọn loại. */
export const WIDGET_TYPE_SOURCE: Record<WidgetType, string> = {
  VALUE: 'Kênh dữ liệu',
  LINE: 'Kênh dữ liệu',
  DEVICE_LIST: 'Theo đơn vị',
  DEVICES_ONLINE: 'Theo đơn vị',
  SWITCH: 'Chân relay',
}
