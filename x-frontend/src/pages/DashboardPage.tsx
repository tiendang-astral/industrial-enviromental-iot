import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout'
import { GridBackground } from 'react-grid-layout/extras'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { LayoutGrid, Pencil, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddWidgetDialog } from '@/components/widgets/AddWidgetDialog'
import { DeviceListWidget } from '@/components/widgets/DeviceListWidget'
import { DevicesOnlineWidget } from '@/components/widgets/DevicesOnlineWidget'
import { LineWidget } from '@/components/widgets/LineWidget'
import { ValueWidget } from '@/components/widgets/ValueWidget'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import { nextWidgetLayout } from '@/lib/dashboardLayout'
import { useApplyTemplateMutation } from '@/queries/useApplyTemplateMutation'
import { useDashboardQuery } from '@/queries/useDashboardQuery'
import { useDashboardTemplatesQuery } from '@/queries/useDashboardTemplatesQuery'
import { useDatastreamsQuery } from '@/queries/useDatastreamsQuery'
import { useSaveDashboardLayoutMutation } from '@/queries/useSaveDashboardLayoutMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { Datastream, DatastreamReading, Widget as WidgetT, WidgetType } from '@/types/dashboard'

const GRID_COLS = 12
const ROW_HEIGHT = 60
const MARGIN: [number, number] = [12, 12]

const nodeSelectClassName =
  'h-8 min-w-48 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function DashboardPage() {
  const { nodeId } = useParams()
  const navigate = useNavigate()
  const tenantNodeId = Number(nodeId)

  const { data: nodes } = useTenantNodesQuery()
  const node = nodes?.find((n) => n.id === tenantNodeId)

  const { data: dashboard, isLoading } = useDashboardQuery(tenantNodeId)
  const { data: datastreams } = useDatastreamsQuery(tenantNodeId)
  const { data: templates } = useDashboardTemplatesQuery()
  const applyTemplateMutation = useApplyTemplateMutation(tenantNodeId)
  const { saveDebounced, saveNow } = useSaveDashboardLayoutMutation(tenantNodeId)
  const { editMode, toggleEditMode } = useDashboardStore()
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)

  const [widgets, setWidgets] = useState<WidgetT[]>([])
  useEffect(() => {
    if (dashboard) setWidgets(dashboard.widgets)
  }, [dashboard])

  const datastreamById = useMemo(() => {
    const map = new Map<number, Datastream>()
    datastreams?.forEach((ds) => map.set(ds.id, ds))
    return map
  }, [datastreams])

  // (gatewayId:pinType:pinNumber) -> datastreamId, để map RealtimeReadingMessage vào đúng widget
  // (payload STOMP không mang datastreamId, xem API.md § Datastream).
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

  useRealtimeGatewaySocket(tenantNodeId, (message) => {
    const datastreamId = datastreamIdByPin.get(`${message.gatewayId}:${message.pinType}:${message.pinNumber}`)
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

  const { width, containerRef, mounted, measureWidth } = useContainerWidth()

  // Hook có default width=1280 trước khi ResizeObserver đo lần đầu — chủ động đo lại
  // khi vào chế độ Chỉnh sửa / khi widgets thay đổi để tránh lệch width thoáng qua.
  useEffect(() => {
    measureWidth()
  }, [measureWidth, editMode, widgets.length])

  function handleLayoutChange(layout: readonly { i: string; x: number; y: number; w: number; h: number }[]) {
    const updated = widgets.map((widget) => {
      const position = layout.find((item) => item.i === widget.id)
      return position ? { ...widget, layout: { x: position.x, y: position.y, w: position.w, h: position.h } } : widget
    })
    setWidgets(updated)
    saveDebounced(updated)
  }

  // Container không tự cao/thấp lại khi đang kéo/resize (RGL chỉ tính lại kích thước
  // khi commit layout lúc thả tay) — track vị trí/kích thước đang kéo theo thời gian
  // thực để lưới mở rộng/co lại ngay trong lúc thao tác, không phải đợi thả chuột.
  const [liveMaxRow, setLiveMaxRow] = useState(0)
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null)
  function handleDragOrResize(
    _layout: unknown,
    _oldItem: unknown,
    newItem: { i: string; y: number; h: number } | null
  ) {
    if (newItem) {
      setLiveMaxRow(newItem.y + newItem.h)
      setActiveWidgetId(newItem.i)
    }
  }
  function handleDragOrResizeStop() {
    setLiveMaxRow(0)
    setActiveWidgetId(null)
  }

  function handleAddWidget(input: { type: WidgetType; title: string; datastreamId: number | null }) {
    const widget: WidgetT = {
      id: crypto.randomUUID(),
      type: input.type,
      layout: nextWidgetLayout(widgets),
      title: input.title,
      binding: input.datastreamId != null ? { datastreamId: input.datastreamId } : null,
      config: {},
    }
    const updated = [...widgets, widget]
    setWidgets(updated)
    saveNow(updated)
  }

  function handleDeleteWidget(widgetId: string) {
    const updated = widgets.filter((widget) => widget.id !== widgetId)
    setWidgets(updated)
    saveNow(updated)
  }

  // Khi đang kéo/resize 1 widget, bỏ vị trí CŨ (chưa commit) của chính nó ra khỏi phép
  // tính — nếu không, "rows" sẽ không co lại được cho tới khi thả tay dù đang thu nhỏ nó
  // trong lúc kéo (vị trí mới update qua liveMaxRow rồi).
  const committedMaxRow = widgets
    .filter((w) => w.id !== activeWidgetId)
    .reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0)
  const rows = Math.max(2, committedMaxRow, liveMaxRow) + 1
  const gridPixelHeight = rows * ROW_HEIGHT + (rows + 1) * MARGIN[1]

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
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
        <div className="flex items-center gap-2">
          {editMode && (
            <Button size="sm" variant="outline" onClick={() => setIsAddWidgetOpen(true)}>
              <Plus />
              Thêm widget
            </Button>
          )}
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
          <Button size="sm" variant={editMode ? 'default' : 'outline'} onClick={toggleEditMode}>
            <Pencil />
            {editMode ? 'Xong' : 'Chỉnh sửa'}
          </Button>
        </div>
      </div>

      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Chưa có widget nào — áp dụng 1 mẫu hoặc bấm "Chỉnh sửa" → "Thêm widget" để bắt đầu
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={editMode ? { minHeight: gridPixelHeight } : undefined}
      >
        {mounted && widgets.length > 0 && (
          <>
            {editMode && (
              <GridBackground
                width={width}
                cols={GRID_COLS}
                rowHeight={ROW_HEIGHT}
                margin={MARGIN}
                rows={rows}
                color="var(--color-muted)"
                borderRadius={8}
              />
            )}
            <ReactGridLayout
              width={width}
              gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: MARGIN, maxRows: editMode ? rows : Infinity }}
              dragConfig={{ enabled: editMode }}
              resizeConfig={{ enabled: editMode }}
              layout={widgets.map((widget) => ({ i: widget.id, ...widget.layout, minW: 2, minH: 2 }))}
              onLayoutChange={handleLayoutChange}
              onDrag={handleDragOrResize}
              onDragStop={handleDragOrResizeStop}
              onResize={handleDragOrResize}
              onResizeStop={handleDragOrResizeStop}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="group relative overflow-hidden">
                  {editMode && (
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => handleDeleteWidget(widget.id)}
                      title="Xóa widget"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <WidgetRenderer
                    widget={widget}
                    tenantNodeId={tenantNodeId}
                    datastream={widget.binding ? datastreamById.get(widget.binding.datastreamId) : undefined}
                    reading={widget.binding ? readings[widget.binding.datastreamId] : undefined}
                  />
                </div>
              ))}
            </ReactGridLayout>
          </>
        )}
      </div>

      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
        datastreams={datastreams ?? []}
        onAdd={handleAddWidget}
      />
    </div>
  )
}

// memo — DashboardPage re-render liên tục lúc kéo/resize (track liveMaxRow qua
// onDrag/onResize), không memo thì mọi widget khác cũng re-render theo dù props
// không đổi, gây nháy (đặc biệt rõ với ECharts).
const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  tenantNodeId,
  datastream,
  reading,
}: {
  widget: WidgetT
  tenantNodeId: number
  datastream?: Datastream
  reading?: DatastreamReading
}) {
  switch (widget.type) {
    case 'VALUE':
      return <ValueWidget widget={widget} datastream={datastream} reading={reading} />
    case 'LINE':
      return <LineWidget widget={widget} datastream={datastream} reading={reading} />
    case 'DEVICE_LIST':
      return <DeviceListWidget widget={widget} tenantNodeId={tenantNodeId} />
    case 'DEVICES_ONLINE':
      return <DevicesOnlineWidget widget={widget} tenantNodeId={tenantNodeId} />
    default:
      return null
  }
})
