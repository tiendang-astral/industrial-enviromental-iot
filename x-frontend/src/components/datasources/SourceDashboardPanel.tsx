import { useMemo, useState, type ReactNode } from 'react'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useSaveSourceDashboardLayoutMutation } from '@/queries/useSaveSourceDashboardLayoutMutation'
import { useSourceDashboardQuery } from '@/queries/useSourceDashboardQuery'
import type { DatastreamReading } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

/**
 * Board riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem DATABASE.md § dashboard.
 *
 * Dùng chung cho hai đường vào: tab "Dashboard" ở trang chi tiết nguồn (luồng cấu hình) và route
 * /dashboard/source/:id vào từ card-grid của đơn vị (luồng xem số). Khác nhau đúng phần
 * `leftHeader`, nên phần query + realtime + board nằm ở đây thay vì chép hai bản.
 */
export function SourceDashboardPanel({
  externalSourceId,
  leftHeader,
}: {
  externalSourceId: number
  /** Vùng bên trái thanh công cụ của board — route riêng truyền nút back, tab truyền rỗng. */
  leftHeader: ReactNode
}) {
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
    <DashboardBoard
      boardKey={`source:${externalSourceId}`}
      leftHeader={leftHeader}
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
  )
}
