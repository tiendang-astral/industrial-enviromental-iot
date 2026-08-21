import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useSaveSourceDashboardLayoutMutation } from '@/queries/useSaveSourceDashboardLayoutMutation'
import { useSourceDashboardQuery } from '@/queries/useSourceDashboardQuery'
import type { DatastreamReading } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

/**
 * Dashboard riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem
 * DATABASE.md § dashboard, ARCHITECTURE.md § Flow: External source data.
 */
export default function SourceDashboardPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)

  const { data: dashboard, isLoading } = useSourceDashboardQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { data: metrics } = useMetricsQuery()
  const { saveDebounced, saveNow } = useSaveSourceDashboardLayoutMutation(externalSourceId)
  const datastreamList = useMemo(() => datastreams ?? [], [datastreams])
  const metricByCode = useMemo(() => {
    const map = new Map<string, Metric>()
    metrics?.forEach((metric) => map.set(metric.code, metric))
    return map
  }, [metrics])

  const [readings, setReadings] = useState<Record<number, DatastreamReading>>({})

  // Nguồn external luôn có datastreamId thẳng trong payload realtime (không có pin), xem
  // types/telemetry.ts.
  useRealtimeGatewaySocket(dashboard?.tenantNodeId, (message) => {
    const { datastreamId, value, measuredAt } = message
    if (datastreamId == null || value == null || measuredAt == null) return
    setReadings((prev) => {
      const history = [...(prev[datastreamId]?.history ?? []), { value, measuredAt }].slice(-200)
      return {
        ...prev,
        [datastreamId]: { latestValue: value, latestMeasuredAt: measuredAt, history },
      }
    })
  })

  const leftHeader = (
    <div className="flex min-w-0 items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
            <Link
              to={dashboard?.tenantNodeId ? `/dashboard/${dashboard.tenantNodeId}` : '/dashboard'}
            >
              <ChevronLeft />
              <span className="sr-only">Quay lại bảng điều khiển của đơn vị</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Quay lại bảng điều khiển của đơn vị</TooltipContent>
      </Tooltip>
      <h1 className="truncate text-lg font-semibold">
        {dashboard?.name ?? 'Bảng điều khiển theo nguồn'}
      </h1>
    </div>
  )

  return (
    <DashboardBoard
      leftHeader={leftHeader}
      dashboard={dashboard}
      isLoading={isLoading}
      datastreams={datastreamList}
      metricByCode={metricByCode}
      tenantNodeId={dashboard?.tenantNodeId ?? 0}
      allowDeviceWidgets={false}
      readings={readings}
      onSaveDebounced={saveDebounced}
      onSaveNow={saveNow}
    />
  )
}
