import { Link } from 'react-router-dom'
import { TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlertsQuery } from '@/queries/useAlertsQuery'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types/alert'

/** CRITICAL trước, rồi mới nhất trước — cái đáng xử lý ngay phải nằm trên cùng. */
function mostUrgent(alerts: Alert[]): Alert {
  return [...alerts].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })[0]
}

interface OpenAlertsBannerProps {
  tenantNodeId: number
  /** `node:{id}` / `source:{id}` — mỗi board nhớ riêng việc đã tắt băng hay chưa. */
  boardKey: string
  /**
   * Giới hạn băng trong đúng những kênh này — `GET /alerts` lọc theo subtree của node nên không
   * chặn lại thì cả hai board đọc ra cùng một cảnh báo. Chính sách chia nằm ở nơi gọi:
   * board theo đơn vị truyền kênh `GATEWAY_PIN`, board theo nguồn truyền kênh của chính nguồn đó
   * (đều là `EXTERNAL_SOURCE_JOB`). Alert không gắn kênh nào sẽ không hiện ở đâu cả.
   */
  datastreamIds?: number[]
}

/**
 * Không có cảnh báo nào thì không render gì. Một băng "mọi thứ đều ổn" thường trực sẽ dạy mắt bỏ
 * qua đúng vùng màn hình mà lúc có sự cố ta cần nó nhìn vào.
 */
export function OpenAlertsBanner({ tenantNodeId, boardKey, datastreamIds }: OpenAlertsBannerProps) {
  const { data } = useAlertsQuery('OPEN', tenantNodeId)
  const dismissedUpTo = useDashboardStore((state) => state.dismissedAlertBanner[boardKey] ?? 0)
  const dismissAlertBanner = useDashboardStore((state) => state.dismissAlertBanner)

  const scope = datastreamIds && new Set(datastreamIds)
  const alerts = scope
    ? data?.filter((item) => item.datastreamId != null && scope.has(item.datastreamId))
    : data

  if (!alerts?.length) return null

  const latestId = Math.max(...alerts.map((item) => item.id))
  if (latestId <= dismissedUpTo) return null

  const alert = mostUrgent(alerts)
  const others = alerts.length - 1
  const critical = alert.severity === 'CRITICAL'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3',
        critical ? 'border-critical/40 bg-critical/8' : 'border-warning/40 bg-warning/8'
      )}
    >
      <TriangleAlert className={cn('size-4 shrink-0', critical ? 'text-critical' : 'text-warning')} />

      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium">{alert.ruleName ?? 'Cảnh báo'}</span>
        {alert.datastreamName && <span className="text-muted-foreground"> · {alert.datastreamName}</span>}
        {alert.lastObservedValue != null && (
          <span className="tabular text-muted-foreground">
            {' · '}
            {alert.lastObservedValue}
            {alert.metricUnit ? ` ${alert.metricUnit}` : ''}
          </span>
        )}
        <span className="text-muted-foreground"> · {formatRelativeTime(alert.startedAt)}</span>
      </p>

      {others > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">còn {others} cảnh báo khác</span>
      )}

      <Button size="sm" variant="outline" asChild>
        <Link to="/alerts">Xem cảnh báo</Link>
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            onClick={() => dismissAlertBanner(boardKey, latestId)}
          >
            <X />
            <span className="sr-only">Ẩn băng cảnh báo</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ẩn cho tới khi có cảnh báo mới</TooltipContent>
      </Tooltip>
    </div>
  )
}
