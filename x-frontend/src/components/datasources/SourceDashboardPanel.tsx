import { useMemo, useState } from 'react'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { OpenAlertsBanner } from '@/components/dashboard/OpenAlertsBanner'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useSaveSourceDashboardLayoutMutation } from '@/queries/useSaveSourceDashboardLayoutMutation'
import { useSourceDashboardQuery } from '@/queries/useSourceDashboardQuery'
import type { DatastreamReading } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

/**
 * Board riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem DATABASE.md § dashboard.
 * Gói phần query + realtime của một nguồn quanh `DashboardBoard` dùng chung.
 */
export function SourceDashboardPanel({ externalSourceId }: { externalSourceId: number }) {
  const { data: dashboard, isLoading } = useSourceDashboardQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { data: metrics } = useMetricsQuery()
  const { save, isSaving } = useSaveSourceDashboardLayoutMutation(externalSourceId)

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

  return (
    <div className="flex flex-col gap-4">
      {/* Nguồn gắn ở node nào thì cảnh báo của node đó liên quan tới người đang xem board này. */}
      {dashboard?.tenantNodeId != null && (
        <OpenAlertsBanner
          tenantNodeId={dashboard.tenantNodeId}
          boardKey={`source:${externalSourceId}`}
          datastreamIds={datastreamList.map((datastream) => datastream.id)}
        />
      )}
      <DashboardBoard
        boardKey={`source:${externalSourceId}`}
        dashboard={dashboard}
        isLoading={isLoading}
        datastreams={datastreamList}
        metricByCode={metricByCode}
        tenantNodeId={dashboard?.tenantNodeId ?? 0}
        allowDeviceWidgets={false}
        readings={readings}
        onSave={save}
        isSaving={isSaving}
      />
    </div>
  )
}
