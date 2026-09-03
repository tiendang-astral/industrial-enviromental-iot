import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircuitBoard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { GatewayPinFormDialog } from '@/components/devices/GatewayPinFormDialog'
import { GatewayPinsTable } from '@/components/devices/GatewayPinsTable'
import { GatewaySummaryCard } from '@/components/devices/GatewaySummaryCard'
import { PinTelemetryCard, PinTelemetryCardSkeleton } from '@/components/devices/PinTelemetryCard'
import { RelayPinCard } from '@/components/devices/RelayPinCard'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewayTelemetryQuery } from '@/queries/useGatewayTelemetryQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { Metric } from '@/types/metric'
import type { PinTelemetry } from '@/types/telemetry'

/** Biểu đồ trên card cảm biến hiển thị diễn biến trong ngày — 24h, nằm gọn trong bucket `raw`. */
const TELEMETRY_RANGE_MINUTES = 24 * 60

/** Nhãn phân vùng trong tab Dữ liệu — cùng kiểu chữ với hàng tiêu đề cột của bảng. */
function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {count > 0 && <span className="text-xs tabular text-muted-foreground">({count})</span>}
    </div>
  )
}

export default function GatewayDetailPage() {
  const { gatewayId } = useParams()
  const id = Number(gatewayId)

  const { data: gateways } = useAllGatewaysQuery()
  const gateway = gateways?.find((item) => item.id === id)

  const { data: telemetry, isLoading } = useGatewayTelemetryQuery(id, TELEMETRY_RANGE_MINUTES)
  const [pins, setPins] = useState<PinTelemetry[]>([])

  const { data: gatewayPins } = useGatewayPinsQuery(id)
  const [isAddPinOpen, setIsAddPinOpen] = useState(false)
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

  const hasSensors = pins.length > 0
  const hasRelays = outputPins.length > 0
  const dataCount = pins.length + outputPins.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={gateway ? `Thiết bị ${gateway.name}` : 'Thiết bị'}
        backTo="/devices"
        backLabel="Thiết bị"
      />

      <GatewaySummaryCard gateway={gateway} />

      <Tabs defaultValue="data" className="gap-6">
        <TabsList>
          <TabsTrigger value="data">
            Dữ liệu &amp; Điều khiển
            {dataCount > 0 && <span className="tabular text-muted-foreground">{dataCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="pins">
            Cấu hình pin
            {(gatewayPins?.length ?? 0) > 0 && (
              <span className="tabular text-muted-foreground">{gatewayPins?.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Hai vùng đều full width, 4 card/hàng. Vùng nào không có pin thì ẩn cả tiêu đề —
            một tiêu đề đứng trên khoảng trống chỉ tổ làm người đọc tưởng dữ liệu chưa tải xong. */}
        <TabsContent value="data" className="flex flex-col gap-6">
          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <PinTelemetryCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isLoading && hasSensors && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="Cảm biến" count={pins.length} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {pins.map((pin) => (
                  <PinTelemetryCard
                    key={pin.pinId}
                    pin={pin}
                    metric={pin.metricCode ? metricByCode.get(pin.metricCode) : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading && hasSensors && hasRelays && <Separator />}

          {!isLoading && hasRelays && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="Điều khiển" count={outputPins.length} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {outputPins.map((pin) => (
                  <RelayPinCard
                    key={pin.id}
                    gatewayId={id}
                    pin={pin}
                    commandUpdates={commandUpdates}
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading && !hasSensors && !hasRelays && (
            <EmptyState
              icon={CircuitBoard}
              title="Gateway chưa có pin nào"
              description="Khai báo pin ở tab Cấu hình pin để gateway bắt đầu gửi số liệu về và điều khiển được relay."
            />
          )}
        </TabsContent>

        {/* Khai báo chân trước đây nằm ở trang Xưởng/Chuồng trại. Trang đó đã bỏ, mà chân là thuộc
            tính của chính gateway chứ không phải của xưởng, nên chỗ đúng của nó là ở đây. */}
        <TabsContent value="pins" className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsAddPinOpen(true)}>
              <Plus data-icon="inline-start" />
              Thêm pin
            </Button>
          </div>
          <GatewayPinsTable gatewayId={id} />
        </TabsContent>
      </Tabs>

      <GatewayPinFormDialog gatewayId={id} open={isAddPinOpen} onOpenChange={setIsAddPinOpen} />
    </div>
  )
}
