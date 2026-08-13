import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useSaveSourceDashboardLayoutMutation } from '@/queries/useSaveSourceDashboardLayoutMutation'
import { useSourceDashboardQuery } from '@/queries/useSourceDashboardQuery'
import type { DatastreamReading } from '@/types/dashboard'

/**
 * Dashboard riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem
 * DATABASE.md § dashboard, ARCHITECTURE.md § Flow: External source data.
 */
export default function SourceDashboardPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)

  const { data: dashboard, isLoading } = useSourceDashboardQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { saveDebounced, saveNow } = useSaveSourceDashboardLayoutMutation(externalSourceId)
  const datastreamList = useMemo(() => datastreams ?? [], [datastreams])

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
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-7" asChild>
        <Link to={dashboard?.tenantNodeId ? `/dashboard/${dashboard.tenantNodeId}` : '/dashboard'}>
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <h2 className="text-lg font-semibold">{dashboard?.name ?? 'Dashboard theo nguồn'}</h2>
    </div>
  )

  return (
    <DashboardBoard
      leftHeader={leftHeader}
      dashboard={dashboard}
      isLoading={isLoading}
      datastreams={datastreamList}
      tenantNodeId={dashboard?.tenantNodeId ?? 0}
      allowDeviceWidgets={false}
      readings={readings}
      onSaveDebounced={saveDebounced}
      onSaveNow={saveNow}
    />
  )
}
