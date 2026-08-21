import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { NodeOverviewCards } from '@/components/dashboard/NodeOverviewCards'
import { SourceCardGrid } from '@/components/dashboard/SourceCardGrid'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useApplyTemplateMutation } from '@/queries/useApplyTemplateMutation'
import { useDashboardQuery } from '@/queries/useDashboardQuery'
import { useDashboardTemplatesQuery } from '@/queries/useDashboardTemplatesQuery'
import { useDatastreamsQuery } from '@/queries/useDatastreamsQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useSaveDashboardLayoutMutation } from '@/queries/useSaveDashboardLayoutMutation'
import { useTenantNodeOverviewQuery } from '@/queries/useTenantNodeOverviewQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Datastream, DatastreamReading } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

export default function DashboardPage() {
  const { nodeId } = useParams()
  const tenantNodeId = Number(nodeId)

  const { data: nodes } = useTenantNodesQuery()
  const node = nodes?.find((n) => n.id === tenantNodeId)

  // Chọn đơn vị đã có cây tổ chức thường trực ở sidebar (AppShell) nên trang không lặp lại
  // combobox chọn node nữa — chỉ giữ tiêu đề cho biết đang xem đơn vị nào.
  const pageTitle = (
    <h1 className="min-w-0 truncate text-lg font-semibold">{node?.name ?? 'Bảng điều khiển'}</h1>
  )

  if (node && node.nodeType !== 'SITE') {
    return (
      <div className="flex flex-col gap-4">
        {pageTitle}
        <NodeOverviewCards nodeId={tenantNodeId} />
      </div>
    )
  }

  return <SiteDashboard tenantNodeId={tenantNodeId} pageTitle={pageTitle} />
}

type SiteView = 'site' | 'sources'

function SiteDashboard({ tenantNodeId, pageTitle }: { tenantNodeId: number; pageTitle: React.ReactNode }) {
  const [view, setView] = useState<SiteView>('site')

  const { data: dashboard, isLoading } = useDashboardQuery(tenantNodeId)
  const { data: datastreams } = useDatastreamsQuery(tenantNodeId)
  const { data: templates } = useDashboardTemplatesQuery()
  const { data: overview } = useTenantNodeOverviewQuery(tenantNodeId)
  const { data: metrics } = useMetricsQuery()
  const applyTemplateMutation = useApplyTemplateMutation(tenantNodeId)
  const { saveDebounced, saveNow } = useSaveDashboardLayoutMutation(tenantNodeId)

  const metricByCode = useMemo(() => {
    const map = new Map<string, Metric>()
    metrics?.forEach((metric) => map.set(metric.code, metric))
    return map
  }, [metrics])

  const datastreamIdByPin = useMemo(() => {
    const map = new Map<string, number>()
    datastreams?.forEach((ds) => {
      if (ds.sourceGatewayId != null && ds.sourcePinType && ds.sourcePinNumber != null) {
        map.set(`${ds.sourceGatewayId}:${ds.sourcePinType}:${ds.sourcePinNumber}`, ds.id)
      }
    })
    return map
  }, [datastreams])

  const [readings, setReadings] = useState<Record<number, DatastreamReading>>({})
  const { commandUpdates, handleCommandMessage } = useCommandUpdates()

  // Payload realtime có 3 dạng (xem types/telemetry.ts): datastreamId thẳng (nguồn external),
  // gatewayId+pinType+pinNumber (nguồn gateway, cần tra map riêng), hoặc commandId (Phase 7).
  useRealtimeGatewaySocket(tenantNodeId, (message) => {
    if (message.commandId) {
      handleCommandMessage(message)
      return
    }
    const datastreamId =
      message.datastreamId ??
      (message.gatewayId != null && message.pinType && message.pinNumber != null
        ? datastreamIdByPin.get(`${message.gatewayId}:${message.pinType}:${message.pinNumber}`)
        : undefined)
    const { value, measuredAt } = message
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
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as SiteView)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {pageTitle}
        <TabsList>
          <TabsTrigger value="site">Xem site</TabsTrigger>
          <TabsTrigger value="sources">
            Xem theo nguồn
            {(overview?.sources?.length ?? 0) > 0 && (
              <span className="tabular text-muted-foreground">{overview?.sources.length}</span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sources">
        <SourceCardGrid sources={overview?.sources ?? []} />
      </TabsContent>

      <TabsContent value="site">
        <DashboardBoard
          leftHeader={<div />}
          extraActions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={!templates?.length}>
                  <Sparkles data-icon="inline-start" />
                  Áp dụng mẫu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {templates?.map((template) => (
                  <DropdownMenuItem key={template.id} onSelect={() => applyTemplateMutation.mutate(template.id)}>
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
          dashboard={dashboard}
          isLoading={isLoading}
          datastreams={datastreams ?? ([] as Datastream[])}
          metricByCode={metricByCode}
          tenantNodeId={tenantNodeId}
          allowDeviceWidgets
          readings={readings}
          commandUpdates={commandUpdates}
          onSaveDebounced={saveDebounced}
          onSaveNow={saveNow}
        />
      </TabsContent>
    </Tabs>
  )
}
