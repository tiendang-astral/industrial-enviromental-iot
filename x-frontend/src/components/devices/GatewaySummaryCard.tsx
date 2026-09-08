import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/patterns/CopyButton'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { isGatewayOnline } from '@/lib/gatewayStatus'
import { summarizePins } from '@/lib/gatewayPinView'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { GatewayPinViews } from '@/lib/gatewayPinView'
import type { Gateway } from '@/types/gateway'

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
 * Dải thông tin đầu trang chi tiết. Trả lời hai câu người trực ca hỏi trước khi nhìn số:
 * thiết bị còn sống không, và có gì bất thường không.
 *
 * Số kênh ngoài ngưỡng đặt ở đây chứ không để người dùng tự quét từng ô — gateway 20 kênh thì
 * quét bằng mắt là bỏ sót.
 */
export function GatewaySummaryCard({
  gateway,
  views,
}: {
  gateway: Gateway | undefined
  views: GatewayPinViews
}) {
  if (!gateway) {
    return (
      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const online = isGatewayOnline(gateway.lastSeenAt)
  const summary = summarizePins(views, online)

  return (
    <Card>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

        {/* Một ô, đổi vai theo trạng thái: đang chạy thì "hoạt động lần cuối" chỉ lặp lại điều
            badge đã nói; mất kết nối thì thứ cần biết là im lặng bao lâu rồi, chứ không phải
            nhắc lại rằng nó đang mất kết nối. */}
        {online ? (
          <Stat label="Trạng thái">
            <StatusBadge status="ONLINE" />
          </Stat>
        ) : (
          <Stat label="Hoạt động lần cuối">
            {gateway.lastSeenAt ? (
              // Mốc tuyệt đối vẫn giữ trong tooltip để đối chiếu với log, chỉ bỏ gạch chân và
              // con trỏ dấu hỏi.
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="tabular">{formatRelativeTime(gateway.lastSeenAt)}</span>
                </TooltipTrigger>
                <TooltipContent>{formatDateTime(gateway.lastSeenAt)}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-muted-foreground">Chưa từng kết nối</span>
            )}
          </Stat>
        )}

        {/* Mỗi chân đọc là một cảm biến, nên gọi đúng tên nó — "kênh dữ liệu" là từ của tầng
            datastream, không phải thứ người vận hành nhìn thấy ở đây. */}
        <Stat label="Cảm biến">
          <span className="text-xl leading-none font-semibold tabular">
            {summary.channelCount}
          </span>
          {summary.outOfRangeCount > 0 && (
            <span className="ml-1 tabular text-critical">
              · {summary.outOfRangeCount} ngoài ngưỡng
            </span>
          )}
        </Stat>

        <Stat label="Điều khiển">
          {summary.relayCount === 0 ? (
            <span className="text-muted-foreground">Không có</span>
          ) : (
            <>
              <span className="text-xl leading-none font-semibold tabular">
                {summary.relayCount}
              </span>
              <span className="ml-1 tabular text-muted-foreground">
                · {summary.relayOnCount} đang bật
              </span>
            </>
          )}
        </Stat>
      </CardContent>
    </Card>
  )
}
