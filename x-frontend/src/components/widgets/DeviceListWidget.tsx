import { memo } from 'react'
import { Router } from 'lucide-react'
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
  const { data: devices } = useDevicesQuery(tenantNodeId)

  return (
    <Widget>
      <Widget.Header title={widget.title} />
      <Widget.Body className="justify-start gap-0 overflow-y-auto">
        {devices?.length === 0 && <p className="text-sm text-muted-foreground">Không có thiết bị nào</p>}
        <ul className="divide-y divide-border">
          {devices?.map((device) => (
            <li key={device.id} className="flex min-w-0 items-center gap-2 py-1.5 first:pt-0">
              <Router className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{device.name}</span>
              <span
                className={`size-2 shrink-0 rounded-full ${device.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                title={device.online ? 'Online' : 'Offline'}
              />
            </li>
          ))}
        </ul>
      </Widget.Body>
    </Widget>
  )
})
