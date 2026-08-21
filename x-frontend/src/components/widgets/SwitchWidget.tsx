import { memo } from 'react'
import { Power } from 'lucide-react'
import { Widget } from '@/components/widgets/Widget'
import { RelaySwitch } from '@/components/RelaySwitch'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import type { CommandUpdate } from '@/types/command'
import type { Widget as WidgetT } from '@/types/dashboard'

interface SwitchWidgetProps {
  widget: WidgetT
  commandUpdates: Record<string, CommandUpdate>
}

// memo — cùng lý do ValueWidget/LineWidget (DashboardPage re-render liên tục lúc kéo/resize).
export const SwitchWidget = memo(function SwitchWidget({ widget, commandUpdates }: SwitchWidgetProps) {
  const gatewayId = widget.binding?.gatewayId
  const pinId = widget.binding?.pinId
  const { data: pins } = useGatewayPinsQuery(gatewayId ?? 0)
  const pin = pins?.find((p) => p.id === pinId)

  return (
    <Widget>
      <Widget.Header title={widget.title} icon={Power} iconClassName="text-muted-foreground" />
      <Widget.Body className="flex-row items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pin ? (pin.powerReportedState === 'ON' ? 'Đang bật' : 'Đang tắt') : 'Chưa có dữ liệu'}
        </p>
        {gatewayId != null && pinId != null && (
          <RelaySwitch
            gatewayId={gatewayId}
            pinId={pinId}
            powerReportedState={pin?.powerReportedState ?? null}
            commandUpdates={commandUpdates}
            disabled={pin ? !pin.enabled : true}
          />
        )}
      </Widget.Body>
    </Widget>
  )
})
