import { memo, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDevicesQuery } from '@/queries/useDevicesQuery'
import type { Widget as WidgetT } from '@/types/dashboard'

export const DevicesOnlineWidget = memo(function DevicesOnlineWidget({
  widget,
  tenantNodeId,
}: {
  widget: WidgetT
  tenantNodeId: number
}) {
  const { data: devices } = useDevicesQuery(tenantNodeId)
  const [isOfflineOpen, setIsOfflineOpen] = useState(false)

  const offlineDevices = devices?.filter((d) => !d.online) ?? []
  const onlineCount = (devices?.length ?? 0) - offlineDevices.length
  const hasOffline = offlineDevices.length > 0

  return (
    <Widget>
      <Widget.Header title={widget.title} />
      <Widget.Body className="flex-row items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg bg-muted/40 py-2">
          <Wifi className="size-5 shrink-0 text-emerald-600" />
          <p className="truncate text-xl font-semibold tabular-nums">{onlineCount}</p>
          <p className="text-xs text-muted-foreground">online</p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => hasOffline && setIsOfflineOpen(true)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors ${
                  hasOffline ? 'cursor-pointer bg-destructive/10 hover:bg-destructive/15' : 'cursor-default bg-muted/40'
                }`}
              >
                <WifiOff className={`size-5 shrink-0 ${hasOffline ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className="truncate text-xl font-semibold tabular-nums">{offlineDevices.length}</p>
                <p className="text-xs text-muted-foreground">offline</p>
              </button>
            </TooltipTrigger>
            <TooltipContent>{hasOffline ? 'Xem danh sách thiết bị offline' : 'Không có thiết bị offline'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Widget.Body>

      <Dialog open={isOfflineOpen} onOpenChange={setIsOfflineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thiết bị offline ({offlineDevices.length})</DialogTitle>
          </DialogHeader>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {offlineDevices.map((device) => (
              <li key={device.id} className="flex items-center gap-2 py-2">
                <WifiOff className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{device.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {device.lastSeenAt
                      ? `Lần cuối online: ${new Date(device.lastSeenAt).toLocaleString('vi-VN')}`
                      : 'Chưa từng online'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Widget>
  )
})
