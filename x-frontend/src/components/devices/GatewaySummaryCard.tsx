import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/patterns/CopyButton'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Gateway } from '@/types/gateway'

/** Khớp `app.device.online-threshold-minutes` mặc định ở backend (5'). */
const ONLINE_THRESHOLD_MINUTES = 5

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MINUTES * 60000
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-h-7 items-center gap-1 text-sm">{children}</div>
    </div>
  )
}

/**
 * Dải thông tin định danh của gateway, đặt trên cùng trang chi tiết. Gom 4 thứ mà người vận hành
 * cần trước khi nhìn số liệu: đang là thiết bị nào, MAC để đối chiếu với cấu hình ngoài hiện
 * trường, còn sống không, và im lặng bao lâu rồi.
 */
export function GatewaySummaryCard({ gateway }: { gateway: Gateway | undefined }) {
  if (!gateway) {
    return (
      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const online = isOnline(gateway.lastSeenAt)

  return (
    <Card>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tên thiết bị">
          <span className="truncate font-medium text-foreground">{gateway.name}</span>
        </Stat>

        <Stat label="Địa chỉ MAC">
          <span className="truncate tabular">{gateway.macAddress}</span>
          <CopyButton
            value={gateway.macAddress}
            label={`Sao chép địa chỉ MAC ${gateway.macAddress}`}
          />
        </Stat>

        <Stat label="Trạng thái">
          <StatusBadge status={online ? 'ONLINE' : 'OFFLINE'} />
        </Stat>

        <Stat label="Hoạt động lần cuối">
          {gateway.lastSeenAt ? (
            // Khoảng cách tương đối dễ nắm hơn ("3 phút trước"), nhưng mốc tuyệt đối mới đối chiếu
            // được với log — để mốc chính xác trong tooltip.
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help tabular underline decoration-dotted underline-offset-4">
                  {formatRelativeTime(gateway.lastSeenAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{formatDateTime(gateway.lastSeenAt)}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground">Chưa từng kết nối</span>
          )}
        </Stat>
      </CardContent>
    </Card>
  )
}
