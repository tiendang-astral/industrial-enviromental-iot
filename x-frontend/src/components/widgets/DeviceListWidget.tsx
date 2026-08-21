import { memo } from 'react'
import { Router } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Widget } from '@/components/widgets/Widget'
import { useDevicesQuery } from '@/queries/useDevicesQuery'
import type { Widget as WidgetT } from '@/types/dashboard'

export const DeviceListWidget = memo(function DeviceListWidget({
  widget,
  tenantNodeId,
}: {
  widget: WidgetT
  tenantNodeId: number
}) {
  const { data: devices, isLoading } = useDevicesQuery(tenantNodeId)

  return (
    <Widget>
      <Widget.Header title={widget.title} icon={Router} iconClassName="text-muted-foreground" />
      <Widget.Body className="justify-start gap-0 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        )}
        {!isLoading && devices?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Đơn vị này chưa có gateway nào gửi dữ liệu về.
          </p>
        )}
        <ul className="divide-y divide-border">
          {devices?.map((device) => (
            <li key={device.id} className="flex min-w-0 items-center gap-2 py-1.5 first:pt-0">
              <Router className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{device.name}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`size-2 shrink-0 rounded-full ${device.online ? 'bg-ok' : 'bg-muted-foreground/40'}`}
                  >
                    <span className="sr-only">
                      {device.online ? 'Trực tuyến' : 'Mất kết nối'}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{device.online ? 'Trực tuyến' : 'Mất kết nối'}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </Widget.Body>
    </Widget>
  )
})
