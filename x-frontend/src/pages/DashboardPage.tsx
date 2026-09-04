import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Database, Network, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { DashboardBoard } from '@/components/dashboard/DashboardBoard'
import { SourceDashboardPanel } from '@/components/datasources/SourceDashboardPanel'
import { useCommandUpdates } from '@/hooks/useCommandUpdates'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { useApplyTemplateMutation } from '@/queries/useApplyTemplateMutation'
import { useDashboardQuery } from '@/queries/useDashboardQuery'
import { useDashboardTemplatesQuery } from '@/queries/useDashboardTemplatesQuery'
import { useDatastreamsQuery } from '@/queries/useDatastreamsQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useSaveDashboardLayoutMutation } from '@/queries/useSaveDashboardLayoutMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { orderNodesDepthFirst } from '@/lib/tenantNodeTree'
import type { Datastream, DatastreamReading, DashboardTemplate } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

type NodeView = 'board' | 'sources'

export default function DashboardPage() {
  const { nodeId } = useParams()
  const tenantNodeId = Number(nodeId)
  const navigate = useNavigate()

  // Nguồn đang xem nằm trong URL để chia sẻ link/reload không mất. Sự có mặt của tham số quyết
  // định luôn tab đang mở — `has` chứ không phải giá trị, vì đơn vị chưa có nguồn nào vẫn phải
  // đứng được ở tab này.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: NodeView = searchParams.has('source') ? 'sources' : 'board'
  const [pendingTemplate, setPendingTemplate] = useState<DashboardTemplate | null>(null)

  const { data: nodes } = useTenantNodesQuery()
  const { data: dashboard, isLoading } = useDashboardQuery(tenantNodeId)
  // includeDescendants — board ở cấp gộp bind kênh của site con; ở SITE subtree thu về chính nó.
  const { data: datastreams } = useDatastreamsQuery(tenantNodeId, true)
  const { data: gateways } = useGatewaysQuery(tenantNodeId, true)
  const { data: templates } = useDashboardTemplatesQuery()
  const { data: sources } = useExternalSourcesQuery()
  const { data: metrics } = useMetricsQuery()
  const applyTemplateMutation = useApplyTemplateMutation(tenantNodeId)
  const { save, isSaving } = useSaveDashboardLayoutMutation(tenantNodeId)

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

  // Mỗi site publish vào channel Redis riêng, nên board gộp phải nghe đúng những site nó đang hiện:
  // node của kênh đang bind, cộng node của gateway đang bind (widget SWITCH nhận ACK ở đó).
  const listenNodeIds = useMemo(() => {
    const ids = new Set<number>([tenantNodeId])
    const datastreamById = new Map(datastreams?.map((ds) => [ds.id, ds]) ?? [])
    const gatewayById = new Map(gateways?.map((gateway) => [gateway.id, gateway]) ?? [])
    for (const widget of dashboard?.widgets ?? []) {
      const boundDatastream =
        widget.binding?.datastreamId != null ? datastreamById.get(widget.binding.datastreamId) : undefined
      if (boundDatastream) ids.add(boundDatastream.tenantNodeId)
      const boundGateway =
        widget.binding?.gatewayId != null ? gatewayById.get(widget.binding.gatewayId) : undefined
      if (boundGateway?.tenantNodeId != null) ids.add(boundGateway.tenantNodeId)
    }
    return [...ids]
  }, [tenantNodeId, dashboard, datastreams, gateways])

  const [readings, setReadings] = useState<Record<number, DatastreamReading>>({})
  const { commandUpdates, handleCommandMessage } = useCommandUpdates()

  // Payload realtime có 3 dạng (xem types/telemetry.ts): datastreamId thẳng (nguồn external),
  // gatewayId+pinType+pinNumber (nguồn gateway, cần tra map riêng), hoặc commandId (Phase 7).
  // Tab nguồn có socket riêng bên trong SourceDashboardPanel — giữ thêm socket của board node lúc
  // đó là mở thừa một kết nối cho thứ không hiển thị.
  useRealtimeGatewaySocket(view === 'board' ? listenNodeIds : undefined, (message) => {
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

  // Danh sách nguồn theo scope của người dùng, không theo node đang chọn — nên tab này không cần
  // (và không hiện) ô chọn đơn vị.
  const sourceList = useMemo(() => sources ?? [], [sources])

  // Tham số URL có thể trỏ nguồn đã bị xoá, hoặc nguồn của đơn vị vừa rời khỏi — rơi về nguồn đầu
  // tiên thay vì hiện board rỗng khó hiểu.
  const selectedSource = useMemo(() => {
    const paramId = Number(searchParams.get('source'))
    return sourceList.find((source) => source.id === paramId) ?? sourceList[0] ?? null
  }, [sourceList, searchParams])

  // Nguồn gắn được ở bất kỳ cấp nào, nên danh sách ở đơn vị cấp trên trộn nguồn của nhiều đơn vị —
  // không tách nhóm thì hai nguồn trùng tên đọc ra y hệt nhau.
  const sourceGroups = useMemo(() => {
    const nodeName = new Map(nodes?.map((node) => [node.id, node.name]) ?? [])
    const order = orderNodesDepthFirst(nodes ?? []).map((node) => node.id)
    const byNode = new Map<number, typeof sourceList>()
    for (const source of sourceList) {
      const list = byNode.get(source.tenantNodeId) ?? []
      list.push(source)
      byNode.set(source.tenantNodeId, list)
    }
    return [...byNode.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([id, items]) => ({ nodeId: id, name: nodeName.get(id) ?? `#${id}`, items }))
  }, [sourceList, nodes])

  const sourcePicker = (
    <Select
      value={selectedSource ? String(selectedSource.id) : ''}
      onValueChange={(value) => setSearchParams({ source: value })}
    >
      <SelectTrigger id="dashboard-source" className="w-64 gap-1.5 sm:w-80">
        <span className="shrink-0 text-muted-foreground">Nguồn dữ liệu</span>
        <SelectValue placeholder="Chọn nguồn dữ liệu" />
      </SelectTrigger>
      <SelectContent>
        {sourceGroups.map((group) => (
          <SelectGroup key={group.nodeId}>
            {sourceGroups.length > 1 && <SelectLabel>{group.name}</SelectLabel>}
            {group.items.map((source) => (
              <SelectItem key={source.id} value={String(source.id)}>
                {source.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )

  // Áp mẫu ở cấp trên quét cả subtree, nên một cú bấm ở gốc cây có thể sinh vài chục widget —
  // đếm trước bằng đúng luật dedupe của backend (type + datastreamId).
  const pendingWidgetCount = useMemo(() => {
    if (!pendingTemplate) return 0
    const existing = new Set(
      (dashboard?.widgets ?? []).map((widget) => `${widget.type}:${widget.binding?.datastreamId ?? null}`)
    )
    let count = 0
    for (const entry of pendingTemplate.layoutJson) {
      for (const datastream of datastreams ?? []) {
        if (datastream.metricCode !== entry.metric) continue
        const key = `${entry.widgetType}:${datastream.id}`
        if (existing.has(key)) continue
        existing.add(key)
        count++
      }
    }
    return count
  }, [pendingTemplate, dashboard, datastreams])

  return (
    <>
      <Tabs
        value={view}
        onValueChange={(value) =>
          setSearchParams(
            value === 'sources' ? { source: String(selectedSource?.id ?? '') } : {}
          )
        }
        className="flex flex-col gap-4"
      >
        {/* Ô chọn đứng ngay sát trái tab strip: hai thứ này cùng trả lời "đang xem cái gì", tách xa
            hai đầu màn hình thì mắt phải nhảy qua lại. Một ô tại một thời điểm, cùng bề rộng. */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {view === 'board' ? (
            <TenantNodePicker
              id="dashboard-node"
              mode="single"
              nodes={nodes ?? []}
              value={Number.isFinite(tenantNodeId) ? tenantNodeId : null}
              onChange={(id) => navigate(`/dashboard/${id}`)}
              label="Tổ chức"
              placeholder="Chọn tổ chức"
              className="w-64 sm:w-80"
            />
          ) : (
            selectedSource && sourcePicker
          )}
          {/* Icon lấy đúng bộ sidebar dùng cho hai khái niệm này (navConfig) — cùng một thứ thì cùng
              một ký hiệu, người dùng không phải học lại. */}
          <TabsList>
            <TabsTrigger value="board">
              <Network data-icon="inline-start" />
              Tổ chức
            </TabsTrigger>
            <TabsTrigger value="sources">
              <Database data-icon="inline-start" />
              Nguồn dữ liệu
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sources">
          {selectedSource ? (
            // key — panel giữ readings trong state cục bộ, không remount thì đổi nguồn xong số đo
            // của nguồn cũ còn nằm lại trên widget.
            <SourceDashboardPanel
              key={selectedSource.id}
              externalSourceId={selectedSource.id}
              leftHeader={<span />}
            />
          ) : (
            <EmptyState
              icon={Database}
              title="Chưa có nguồn dữ liệu nào ở đây"
              description="Phạm vi của bạn chưa có nguồn dữ liệu ngoài nào. Thêm nguồn ở trang Nguồn dữ liệu."
            />
          )}
        </TabsContent>

        <TabsContent value="board">
          <DashboardBoard
            boardKey={`node:${tenantNodeId}`}
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
                    <DropdownMenuItem
                      key={template.id}
                      // Hoãn một nhịp: Radix đóng menu và trả focus ngay sau onSelect, mở Dialog
                      // trong cùng nhịp đó thì Dialog bị đóng theo và bấm "Áp dụng mẫu" tưởng như
                      // không có tác dụng gì.
                      onSelect={() => setTimeout(() => setPendingTemplate(template), 0)}
                    >
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
            onSave={save}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
        title="Áp dụng mẫu này?"
        question={
          <>
            Áp mẫu <span className="font-semibold">&ldquo;{pendingTemplate?.name}&rdquo;</span>?
          </>
        }
        description={
          pendingWidgetCount > 0
            ? `Sẽ thêm ${pendingWidgetCount} widget cho mọi kênh khớp trong đơn vị này và các đơn vị bên dưới. Widget đang có được giữ nguyên.`
            : 'Không có kênh nào khớp mẫu này trong phạm vi đơn vị đang xem — áp mẫu sẽ không thêm widget nào.'
        }
        confirmLabel="Áp dụng"
        isPending={applyTemplateMutation.isPending}
        onConfirm={() => {
          if (!pendingTemplate) return
          applyTemplateMutation.mutate(pendingTemplate.id, {
            onSettled: () => setPendingTemplate(null),
          })
        }}
      />
    </>
  )
}
