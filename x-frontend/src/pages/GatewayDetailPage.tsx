import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelaySwitch } from '@/components/RelaySwitch'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { buildSparklineOption } from '@/lib/echarts'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewayTelemetryQuery } from '@/queries/useGatewayTelemetryQuery'
import type { GatewayPin } from '@/types/gatewayPin'
import type { PinTelemetry } from '@/types/telemetry'

export default function GatewayDetailPage() {
  const { gatewayId } = useParams()
  const id = Number(gatewayId)

  const { data: gateways } = useAllGatewaysQuery()
  const gateway = gateways?.find((g) => g.id === id)

  const { data: telemetry, isLoading } = useGatewayTelemetryQuery(id)
  const [pins, setPins] = useState<PinTelemetry[]>([])

  const { data: gatewayPins } = useGatewayPinsQuery(id)
  const outputPins = gatewayPins?.filter((pin) => pin.direction === 'OUTPUT') ?? []
  const { commandUpdates, handleCommandMessage } = useCommandUpdates()

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
                  ? [...pin.history, { value: message.value, measuredAt: message.measuredAt }].slice(-200)
                  : pin.history,
            }
          : pin
      )
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link to="/devices">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{gateway?.name ?? 'Gateway'}</h2>
          {gateway && <p className="text-xs text-muted-foreground">{gateway.macAddress}</p>}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {!isLoading && pins.length === 0 && (
        <p className="text-sm text-muted-foreground">Gateway chưa có pin INPUT nào gắn metric</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pins.map((pin) => (
          <PinTelemetryCard key={pin.pinId} pin={pin} />
        ))}
      </div>

      {outputPins.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Relay (chân OUTPUT)</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outputPins.map((pin) => (
              <RelayPinCard key={pin.id} gatewayId={id} pin={pin} commandUpdates={commandUpdates} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{pin.name}</p>
        <p className="text-xs text-muted-foreground">
          {pin.type} · Chân {pin.pinNumber} · {pin.powerReportedState === 'ON' ? 'Đang bật' : 'Đang tắt'}
        </p>
      </div>
      <RelaySwitch
        gatewayId={gatewayId}
        pinId={pin.id}
        powerReportedState={pin.powerReportedState}
        commandUpdates={commandUpdates}
        disabled={!pin.enabled}
      />
    </div>
  )
}

function PinTelemetryCard({ pin }: { pin: PinTelemetry }) {
  const chartOption = useMemo(() => buildSparklineOption(pin.history), [pin.history])

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{pin.name}</p>
          <p className="text-xs text-muted-foreground">
            {pin.type} · Chân {pin.pinNumber}
          </p>
        </div>
        <Badge variant="outline">{pin.metricCode ?? 'Chưa gán metric'}</Badge>
      </div>

      <div>
        <p className="text-3xl font-semibold tabular-nums">
          {pin.latestValue != null ? pin.latestValue : '—'}
          {pin.unit && pin.latestValue != null && (
            <span className="ml-1 text-base font-normal text-muted-foreground">{pin.unit}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {pin.latestMeasuredAt
            ? `Cập nhật lúc ${new Date(pin.latestMeasuredAt).toLocaleTimeString('vi-VN')}`
            : 'Chưa có dữ liệu'}
        </p>
      </div>

      {pin.history.length > 1 ? (
        <ReactECharts option={chartOption} style={{ height: 120 }} notMerge />
      ) : (
        <div className="flex h-[120px] items-center justify-center text-xs text-muted-foreground">
          Chưa đủ dữ liệu để vẽ biểu đồ
        </div>
      )}
    </div>
  )
}
