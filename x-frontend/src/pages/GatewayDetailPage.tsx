import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Gauge, ToggleLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { RelaySwitch } from '@/components/RelaySwitch'
import { PinTelemetryCard, PinTelemetryCardSkeleton } from '@/components/devices/PinTelemetryCard'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewayTelemetryQuery } from '@/queries/useGatewayTelemetryQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { GatewayPin } from '@/types/gatewayPin'
import type { Metric } from '@/types/metric'
import type { PinTelemetry } from '@/types/telemetry'

function RelayPinCard({
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
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate font-medium">{pin.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular">
              {pin.type} · Chân {pin.pinNumber}
            </span>
            <StatusBadge
              status={pin.powerReportedState === 'ON' ? 'ENABLED' : 'DISABLED'}
              label={pin.powerReportedState === 'ON' ? 'Đang bật' : 'Đang tắt'}
            />
            {!pin.enabled && <StatusBadge status="DISABLED" label="Pin đã tắt" />}
          </div>
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

export default function GatewayDetailPage() {
  const { gatewayId } = useParams()
  const id = Number(gatewayId)

  const { data: gateways } = useAllGatewaysQuery()
  const gateway = gateways?.find((item) => item.id === id)

  const { data: telemetry, isLoading } = useGatewayTelemetryQuery(id)
  const [pins, setPins] = useState<PinTelemetry[]>([])

  const { data: gatewayPins } = useGatewayPinsQuery(id)
  const outputPins = gatewayPins?.filter((pin) => pin.direction === 'OUTPUT') ?? []
  const { commandUpdates, handleCommandMessage } = useCommandUpdates()

  const { data: metrics } = useMetricsQuery()
  const metricByCode = useMemo(() => {
    const map = new Map<string, Metric>()
    metrics?.forEach((metric) => map.set(metric.code, metric))
    return map
  }, [metrics])

  useEffect(() => {
    if (telemetry) {
      setPins(telemetry)
    }
  }, [telemetry])

  useRealtimeGatewaySocket(gateway?.tenantNodeId, (message) => {
    if (message.commandId) {
      handleCommandMessage(message)
      return
    }
    setPins((prev) =>
      prev.map((pin) =>
        pin.pinNumber === message.pinNumber && pin.type === message.pinType
          ? {
              ...pin,
              latestValue: message.value ?? pin.latestValue,
              latestMeasuredAt: message.measuredAt ?? pin.latestMeasuredAt,
              history:
                message.value != null && message.measuredAt != null
                  ? [
                      ...pin.history,
                      { value: message.value, measuredAt: message.measuredAt },
                    ].slice(-200)
                  : pin.history,
            }
          : pin
      )
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={gateway?.name ?? 'Gateway'}
        description={gateway ? `MAC ${gateway.macAddress}` : undefined}
        backTo="/devices"
        backLabel="Thiết bị"
      />

      <Tabs defaultValue="sensors" className="gap-6">
        <TabsList>
          <TabsTrigger value="sensors">
            Cảm biến
            {pins.length > 0 && <span className="tabular text-muted-foreground">{pins.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="relays">
            Điều khiển
            {outputPins.length > 0 && (
              <span className="tabular text-muted-foreground">{outputPins.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => <PinTelemetryCardSkeleton key={index} />)}
          {!isLoading &&
            pins.map((pin) => (
              <PinTelemetryCard
                key={pin.pinId}
                pin={pin}
                metric={pin.metricCode ? metricByCode.get(pin.metricCode) : undefined}
              />
            ))}
          {!isLoading && pins.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Gauge}
                title="Chưa có chân đọc dữ liệu nào"
                description="Gateway này chưa có pin INPUT nào được gắn metric, nên chưa có số liệu để theo dõi. Khai báo pin ở trang xưởng/chuồng trại chứa gateway."
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="relays" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outputPins.map((pin) => (
            <RelayPinCard key={pin.id} gatewayId={id} pin={pin} commandUpdates={commandUpdates} />
          ))}
          {outputPins.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={ToggleLeft}
                title="Chưa có chân điều khiển nào"
                description="Gateway này chưa khai báo pin OUTPUT nên chưa điều khiển được relay từ hệ thống."
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
