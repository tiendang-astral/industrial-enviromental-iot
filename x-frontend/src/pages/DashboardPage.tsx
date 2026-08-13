import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { NodeOverviewCards } from '@/components/dashboard/NodeOverviewCards'
import { SourceCardGrid } from '@/components/dashboard/SourceCardGrid'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useApplyTemplateMutation } from '@/queries/useApplyTemplateMutation'
import { useDashboardQuery } from '@/queries/useDashboardQuery'
import { useDashboardTemplatesQuery } from '@/queries/useDashboardTemplatesQuery'
import { useDatastreamsQuery } from '@/queries/useDatastreamsQuery'
import { useSaveDashboardLayoutMutation } from '@/queries/useSaveDashboardLayoutMutation'
import { useTenantNodeOverviewQuery } from '@/queries/useTenantNodeOverviewQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Datastream, DatastreamReading } from '@/types/dashboard'

const nodeSelectClassName =
  'h-8 min-w-48 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function DashboardPage() {
  const { nodeId } = useParams()
  const navigate = useNavigate()
  const tenantNodeId = Number(nodeId)

  const { data: nodes } = useTenantNodesQuery()
  const node = nodes?.find((n) => n.id === tenantNodeId)

  const nodePicker = (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-semibold">{node?.name ?? 'Dashboard'}</h2>
      <select
        className={nodeSelectClassName}
        value={Number.isNaN(tenantNodeId) ? '' : tenantNodeId}
        onChange={(e) => navigate(`/dashboard/${e.target.value}`)}
      >
        {nodes?.map((n) => (
          <option key={n.id} value={n.id}>
            {'—'.repeat(n.depth - 1)} {n.name}
          </option>
        ))}
      </select>
    </div>
  )

  if (node && node.nodeType !== 'SITE') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">{nodePicker}</div>
        <NodeOverviewCards nodeId={tenantNodeId} />
      </div>
    )
  }

  return <SiteDashboard tenantNodeId={tenantNodeId} nodePicker={nodePicker} />
}

type SiteView = 'site' | 'sources'

function SiteDashboard({ tenantNodeId, nodePicker }: { tenantNodeId: number; nodePicker: React.ReactNode }) {
  const [view, setView] = useState<SiteView>('site')

  const { data: dashboard, isLoading } = useDashboardQuery(tenantNodeId)
  const { data: datastreams } = useDatastreamsQuery(tenantNodeId)
  const { data: templates } = useDashboardTemplatesQuery()
  const { data: overview } = useTenantNodeOverviewQuery(tenantNodeId)
  const applyTemplateMutation = useApplyTemplateMutation(tenantNodeId)
  const { saveDebounced, saveNow } = useSaveDashboardLayoutMutation(tenantNodeId)

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

  // Payload realtime có 2 dạng (xem types/telemetry.ts): datastreamId thẳng (nguồn external)
  // hoặc gatewayId+pinType+pinNumber (nguồn gateway, cần tra map riêng).
  useRealtimeGatewaySocket(tenantNodeId, (message) => {
    const datastreamId =
      message.datastreamId ??
      (message.gatewayId != null && message.pinType && message.pinNumber != null
        ? datastreamIdByPin.get(`${message.gatewayId}:${message.pinType}:${message.pinNumber}`)
        : undefined)
    if (datastreamId == null) return
    setReadings((prev) => {
      const history = [
        ...(prev[datastreamId]?.history ?? []),
        { value: message.value, measuredAt: message.measuredAt },
      ].slice(-200)
      return {
        ...prev,
        [datastreamId]: { latestValue: message.value, latestMeasuredAt: message.measuredAt, history },
      }
    })
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {nodePicker}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView('site')}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${view === 'site' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Xem site
          </button>
          <button
            type="button"
            onClick={() => setView('sources')}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${view === 'sources' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Xem theo nguồn
          </button>
        </div>
      </div>

      {view === 'sources' && <SourceCardGrid sources={overview?.sources ?? []} />}

      {view === 'site' && (
        <DashboardBoard
          leftHeader={<div />}
          extraActions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={!templates?.length}>
                  <Sparkles />
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
          tenantNodeId={tenantNodeId}
          allowDeviceWidgets
          readings={readings}
          onSaveDebounced={saveDebounced}
          onSaveNow={saveNow}
        />
      )}
    </div>
  )
}
