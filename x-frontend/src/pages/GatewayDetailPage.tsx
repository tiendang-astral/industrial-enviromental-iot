import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { buildSparklineOption } from '@/lib/echarts'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useGatewayTelemetryQuery } from '@/queries/useGatewayTelemetryQuery'
import type { PinTelemetry } from '@/types/telemetry'

export default function GatewayDetailPage() {
  const { gatewayId } = useParams()
  const id = Number(gatewayId)

  const { data: gateways } = useAllGatewaysQuery()
  const gateway = gateways?.find((g) => g.id === id)

  const { data: telemetry, isLoading } = useGatewayTelemetryQuery(id)
  const [pins, setPins] = useState<PinTelemetry[]>([])

  useEffect(() => {
    if (telemetry) {
      setPins(telemetry)
    }
  }, [telemetry])

  useRealtimeGatewaySocket(gateway?.tenantNodeId, (message) => {
    setPins((prev) =>
      prev.map((pin) =>
        pin.pinNumber === message.pinNumber && pin.type === message.pinType
          ? {
              ...pin,
              latestValue: message.value,
              latestMeasuredAt: message.measuredAt,
              history: [...pin.history, { value: message.value, measuredAt: message.measuredAt }].slice(-200),
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
