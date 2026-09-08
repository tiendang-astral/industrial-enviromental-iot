import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircuitBoard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { GatewayPinFormDialog } from '@/components/devices/GatewayPinFormDialog'
import { GatewaySummaryCard } from '@/components/devices/GatewaySummaryCard'
import { GatewayPinBoard, GatewayPinBoardSkeleton } from '@/components/devices/GatewayPinBoard'
import {
  TelemetryChartGrid,
  TelemetryChartGridSkeleton,
} from '@/components/devices/TelemetryChartGrid'
import { TelemetryRangePicker } from '@/components/devices/TelemetryRangePicker'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { buildPinViews } from '@/lib/gatewayPinView'
import { isGatewayOnline } from '@/lib/gatewayStatus'
import { DEFAULT_RANGE_MINUTES } from '@/lib/telemetryRanges'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewayTelemetryQuery } from '@/queries/useGatewayTelemetryQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { PinTelemetry } from '@/types/telemetry'

/**
 * Trang chi tiết thiết bị, hai tab.
 *
 * Tab "Tổng quan" trả lời câu hỏi lướt: thiết bị còn sống không, chân nào đang bao nhiêu, có gì
 * ngoài ngưỡng — mỗi chân một hàng, nhìn hết trong một màn hình. Tab "Biểu đồ" mới là chỗ đào sâu
 * theo thời gian. Tách ra vì hai việc đó dùng chung một dữ liệu: gộp vào một trang thì cùng con
 * số hiện hai lần, một lần dạng số một lần dạng sparkline.
 */
export default function GatewayDetailPage() {
  const { gatewayId } = useParams()
  const id = Number(gatewayId)

  const [rangeMinutes, setRangeMinutes] = useState(DEFAULT_RANGE_MINUTES)
  const [isAddPinOpen, setIsAddPinOpen] = useState(false)
  // Tab điều khiển từ state vì bộ chọn khoảng nằm trên hàng tab: để nó hiện ở tab Tổng quan thì
  // đó là một ô điều khiển không điều khiển gì trên màn hình đang xem.
  const [tab, setTab] = useState('overview')

  const { data: gateways } = useAllGatewaysQuery()
  const gateway = gateways?.find((item) => item.id === id)

  const { data: telemetry, isLoading: isTelemetryLoading } = useGatewayTelemetryQuery(
    id,
    rangeMinutes
  )
  const [readings, setReadings] = useState<PinTelemetry[]>([])

  const { data: gatewayPins, isLoading: isPinsLoading } = useGatewayPinsQuery(id)
  const { data: metrics } = useMetricsQuery()
  const { commandUpdates, handleCommandMessage } = useCommandUpdates()

  const views = useMemo(
    () => buildPinViews(gatewayPins, readings, metrics),
    [gatewayPins, readings, metrics]
  )

  useEffect(() => {
    if (telemetry) {
      setReadings(telemetry)
    }
  }, [telemetry])

  useRealtimeGatewaySocket(gateway?.tenantNodeId, (message) => {
    if (message.commandId) {
      handleCommandMessage(message)
      return
    }
    setReadings((prev) =>
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
                    ].slice(-600)
                  : pin.history,
            }
          : pin
      )
    )
  })

  const isLoading = isPinsLoading || isTelemetryLoading
  const hasPins = views.inputs.length > 0 || views.outputs.length > 0
  const gatewayOnline = isGatewayOnline(gateway?.lastSeenAt)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={gateway ? `Thiết bị ${gateway.name}` : 'Thiết bị'}
        backTo="/devices"
        backLabel="Thiết bị"
      />

      <GatewaySummaryCard gateway={gateway} views={views} />

      {/* Tab luôn hiện kể cả khi chưa có pin: nút "Thêm pin" nằm trên hàng tab nên ẩn tab đi là
          mất luôn đường tạo pin đầu tiên. Trạng thái rỗng vì vậy nằm trong tab. */}
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="charts">Biểu đồ</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-3">
            {tab === 'charts' && views.inputs.length > 0 && (
              <TelemetryRangePicker value={rangeMinutes} onChange={setRangeMinutes} />
            )}
            <Button variant="outline" onClick={() => setIsAddPinOpen(true)}>
              <Plus data-icon="inline-start" />
              Thêm pin
            </Button>
          </div>
        </div>

        <TabsContent value="overview">
          {isLoading ? (
            <GatewayPinBoardSkeleton />
          ) : hasPins ? (
            <GatewayPinBoard
              gatewayId={id}
              views={views}
              gatewayOnline={gatewayOnline}
              commandUpdates={commandUpdates}
            />
          ) : (
            <EmptyState
              icon={CircuitBoard}
              title="Gateway chưa có pin nào"
              description="Bấm «Thêm pin» để khai báo chân vật lý trên gateway — sau đó thiết bị mới gửi số liệu về và điều khiển được relay."
            />
          )}
        </TabsContent>

        <TabsContent value="charts">
          {isLoading ? (
            <TelemetryChartGridSkeleton />
          ) : views.inputs.length > 0 ? (
            <TelemetryChartGrid views={views.inputs} />
          ) : (
            <EmptyState
              icon={CircuitBoard}
              title="Chưa có chân đọc dữ liệu"
              description="Chỉ chân đọc (AI/DI) mới sinh số đo để vẽ biểu đồ. Khai báo thêm chân đọc ở tab Tổng quan."
            />
          )}
        </TabsContent>
      </Tabs>

      <GatewayPinFormDialog gatewayId={id} open={isAddPinOpen} onOpenChange={setIsAddPinOpen} />
    </div>
  )
}
