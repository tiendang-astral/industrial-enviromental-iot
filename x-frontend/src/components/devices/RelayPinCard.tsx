import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { RelaySwitch } from '@/components/RelaySwitch'
import { pinLabel } from '@/lib/pinLabels'
import type { useCommandUpdates } from '@/hooks/useCommandUpdates'
import type { GatewayPin } from '@/types/gatewayPin'

/** Một chân điều khiển: định danh bên trái, công tắc bên phải. Cùng bố cục với card cảm biến. */
export function RelayPinCard({
  gatewayId,
  pin,
  commandUpdates,
}: {
  gatewayId: number
  pin: GatewayPin
  commandUpdates: ReturnType<typeof useCommandUpdates>['commandUpdates']
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="truncate font-medium">{pin.name}</span>
          <p className="truncate text-xs text-muted-foreground">
            {pinLabel(pin.type, pin.pinNumber)}
          </p>
          {!pin.enabled && <StatusBadge status="DISABLED" label="Chân đã tắt" />}
        </div>

        <RelaySwitch
          gatewayId={gatewayId}
          pinId={pin.id}
          pinName={pin.name}
          powerReportedState={pin.powerReportedState}
          commandUpdates={commandUpdates}
          disabled={!pin.enabled}
        />
      </CardContent>
    </Card>
  )
}
