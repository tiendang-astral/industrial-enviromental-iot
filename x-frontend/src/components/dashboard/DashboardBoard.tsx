import { memo, useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { toast } from 'sonner'
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout'
import type { Compactor, Layout } from 'react-grid-layout'
import { GridBackground } from 'react-grid-layout/extras'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Grid2x2Check, LayoutGrid, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { BoardEditToolbar } from '@/components/dashboard/BoardEditToolbar'
import { AddWidgetDialog } from '@/components/widgets/AddWidgetDialog'
import { DeviceListWidget } from '@/components/widgets/DeviceListWidget'
import { DevicesOnlineWidget } from '@/components/widgets/DevicesOnlineWidget'
import { LineWidget } from '@/components/widgets/LineWidget'
import { SwitchWidget } from '@/components/widgets/SwitchWidget'
import { ValueWidget } from '@/components/widgets/ValueWidget'
import { clampWidgets, nextWidgetLayout, widgetSizeSpec } from '@/lib/dashboardLayout'
import type { ResolvedTemplate } from '@/lib/dashboardTemplates'
import { widgetDatastreamIds } from '@/lib/widgetBinding'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { CommandUpdate } from '@/types/command'
import type {
  Dashboard,
  Datastream,
  DatastreamReading,
  Widget as WidgetT,
  WidgetType,
} from '@/types/dashboard'
import type { Metric } from '@/types/metric'

const EMPTY_METRIC_BY_CODE = new Map<string, Metric>()
/** Tham chiếu cố định — trả mảng rỗng mới mỗi lần cũng đủ phá `memo`. */
const EMPTY_DATASTREAMS: Datastream[] = []

/** Tên loại widget dạng danh từ thường — dùng để kể ra mẫu sắp dựng những gì. */
const WIDGET_TYPE_NOUN: Record<WidgetType, string> = {
  VALUE: 'ô số',
  LINE: 'biểu đồ',
  DEVICE_LIST: 'danh sách thiết bị',
  DEVICES_ONLINE: 'ô thiết bị trực tuyến',
  SWITCH: 'công tắc',
}
const WIDGET_TYPE_ORDER: WidgetType[] = ['VALUE', 'LINE', 'DEVICES_ONLINE', 'DEVICE_LIST', 'SWITCH']

/** "3 ô số, 2 biểu đồ, 1 danh sách thiết bị" — kể ra mẫu gồm gì thay vì chỉ nêu tổng số. */
function describeWidgets(widgets: WidgetT[]): string {
  return WIDGET_TYPE_ORDER.map((type) => ({ type, count: widgets.filter((w) => w.type === type).length }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${WIDGET_TYPE_NOUN[item.type]}`)
    .join(', ')
}

const GRID_COLS = 12
const ROW_HEIGHT = 60
const MARGIN: [number, number] = [12, 12]

/**
 * Bố cục tự do, KHÔNG đẩy widget khác.
 *
 * - `compact` trả nguyên layout: không nén dọc, nên kéo widget xuống một chút không bị hút ngược về
 *   chỗ cũ — tức đặt được chồng lên một phần vị trí cũ của chính nó.
 * - `preventCollision`: thả vào chỗ đã có widget thì **chặn**, không đẩy widget kia đi. Không có nó
 *   thì RGL đẩy widget bị đụng xuống dưới, mà không có phép nén thì nó **không bao giờ trồi lại** —
 *   mỗi lần kéo ngang qua là nó tụt thêm một đoạn, tích lại thành trôi rất sâu.
 * - `allowOverlap: false`: resize không được đè lên widget khác.
 */
const FREE_LAYOUT_COMPACTOR: Compactor = {
  type: null,
  allowOverlap: false,
  preventCollision: true,
  compact: (layout: Layout) => layout,
}

interface DashboardBoardProps {
  /** Định danh board (`node:{id}` / `source:{id}`) — chế độ chỉnh sửa bám theo board, xem useDashboardStore. */
  boardKey: string
  dashboard: Dashboard | undefined
  isLoading: boolean
  datastreams: Datastream[]
  /** metric.code -> Metric — dùng color-code ValueWidget theo minValue/maxValue. Không truyền = không tô màu ngưỡng. */
  metricByCode?: Map<string, Metric>
  /** Context cho widget DEVICE_LIST/DEVICES_ONLINE — node đứng sau board này. */
  tenantNodeId: number
  /** false = board theo nguồn (external_source) — không có khái niệm gateway/subtree. */
  allowDeviceWidgets: boolean
  readings: Record<number, DatastreamReading>
  /** Không truyền = board không có widget SWITCH (VD board theo nguồn — allowDeviceWidgets=false). */
  commandUpdates?: Record<string, CommandUpdate>
  /** Ghi bản nháp lên server — chỉ gọi khi người dùng bấm Lưu, không gọi theo từng cú kéo. */
  onSave: (widgets: WidgetT[]) => Promise<unknown>
  isSaving: boolean
  /**
   * Mẫu đã dựng sẵn bố cục cho đúng đơn vị này (xem lib/dashboardTemplates). Không truyền = board
   * không áp được mẫu.
   */
  templates?: ResolvedTemplate[]
}

/**
 * Grid widget dùng chung cho dashboard theo node (site) và dashboard theo nguồn (Phase 5) —
 * tách ra từ DashboardPage cũ để 2 trang tái dùng cùng logic kéo-thả/resize/thêm-xóa widget.
 */
export function DashboardBoard({
  boardKey,
  dashboard,
  isLoading,
  datastreams,
  metricByCode = EMPTY_METRIC_BY_CODE,
  tenantNodeId,
  allowDeviceWidgets,
  readings,
  commandUpdates = {},
  onSave,
  isSaving,
  templates,
}: DashboardBoardProps) {
  const editMode = useDashboardStore((state) => state.editingBoardKey === boardKey)
  const dirty = useDashboardStore((state) => state.dirty)
  const toggleEditMode = useDashboardStore((state) => state.toggleEditMode)
  const markDirty = useDashboardStore((state) => state.markDirty)
  const exitEdit = useDashboardStore((state) => state.exitEdit)
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<ResolvedTemplate | null>(null)

  // Đang sửa = bản nháp cục bộ. Chỉ đồng bộ lại từ server khi đã ra khỏi chế độ sửa, nếu không thì
  // mỗi lần cache đổi là đè mất thứ người dùng đang kéo dở. Đây cũng là đường bỏ nháp: `exitEdit()`
  // tắt `editMode`, effect này kéo lại layout đã lưu.
  const [widgets, setWidgets] = useState<WidgetT[]>([])
  useEffect(() => {
    // clampWidgets: board lưu trước khi có ràng buộc cỡ vẫn còn widget quá khổ — kẹp lúc nạp để
    // hiển thị đúng ngay, phần ghi lại chờ người dùng bấm Lưu.
    if (dashboard && !editMode) setWidgets(clampWidgets(dashboard.widgets))
  }, [dashboard, editMode])

  // Chặn mọi đường rời đi khi còn nháp: đổi tab và đổi đơn vị/nguồn đều đi qua điều hướng router
  // (search param), nên một chốt ở đây phủ luôn cả bấm menu lẫn nút Back.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      editMode &&
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  )

  const datastreamById = useMemo(() => {
    const map = new Map<number, Datastream>()
    datastreams.forEach((ds) => map.set(ds.id, ds))
    return map
  }, [datastreams])

  // Một mảng kênh ỔN ĐỊNH cho mỗi widget. Tạo mảng inline trong JSX thì mỗi lần board render là một
  // mảng mới, `memo` của WidgetRenderer không bao giờ ăn — và biểu đồ dựng lại option nên ECharts
  // (`notMerge`) vẽ lại từ đầu, thấy ra là nháy hoặc mất hình mỗi khi bấm vào widget.
  const datastreamsByWidget = useMemo(() => {
    const map = new Map<string, Datastream[]>()
    for (const widget of widgets) {
      map.set(
        widget.id,
        widgetDatastreamIds(widget)
          .map((id) => datastreamById.get(id))
          .filter((ds): ds is Datastream => !!ds)
      )
    }
    return map
  }, [widgets, datastreamById])

  const { width, containerRef, mounted, measureWidth } = useContainerWidth()

  useEffect(() => {
    measureWidth()
  }, [measureWidth, editMode, widgets.length])

  function handleLayoutChange(layout: readonly { i: string; x: number; y: number; w: number; h: number }[]) {
    const updated = widgets.map((widget) => {
      const position = layout.find((item) => item.i === widget.id)
      return position ? { ...widget, layout: { x: position.x, y: position.y, w: position.w, h: position.h } } : widget
    })
    // RGL bắn onLayoutChange cả lúc dựng lưới, không riêng lúc người dùng kéo — không so trước thì
    // board vừa mở đã bị coi là có thay đổi chưa lưu và chặn rời đi vô cớ.
    const changed = updated.some((widget, index) => {
      const before = widgets[index].layout
      const after = widget.layout
      return before.x !== after.x || before.y !== after.y || before.w !== after.w || before.h !== after.h
    })
    if (!changed) return
    setWidgets(updated)
    markDirty()
  }

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
  /**
   * Chốt layout ngay khi thả, không đợi `onLayoutChange`.
   *
   * RGL bắn `onLayoutChange` cho resize nhưng KHÔNG bắn cho drag, nên cú kéo chỉ đổi vị trí trong
   * state nội bộ của RGL còn `widgets` giữ toạ độ cũ: widget nhìn thì đã sang chỗ mới, mà bấm Lưu
   * lại ghi xuống chỗ cũ — tải lại là nó nhảy về. `handleLayoutChange` tự bỏ qua khi không có gì
   * đổi nên gọi thêm ở đây là an toàn.
   */
  function handleDragOrResizeStop(layout: readonly { i: string; x: number; y: number; w: number; h: number }[]) {
    setLiveMaxRow(0)
    setActiveWidgetId(null)
    if (Array.isArray(layout)) handleLayoutChange(layout)
  }

  function handleAddWidget(input: {
    type: WidgetType
    title: string
    datastreamIds: number[]
    gatewayId: number | null
    pinId: number | null
  }) {
    let binding: WidgetT['binding'] = null
    if (input.datastreamIds.length > 0) {
      binding = { datastreamIds: input.datastreamIds }
    } else if (input.gatewayId != null && input.pinId != null) {
      binding = { gatewayId: input.gatewayId, pinId: input.pinId }
    }
    const widget: WidgetT = {
      id: crypto.randomUUID(),
      type: input.type,
      layout: nextWidgetLayout(widgets, input.type),
      title: input.title,
      binding,
      config: {},
    }
    setWidgets([...widgets, widget])
    markDirty()
  }

  function handleDeleteWidget(widgetId: string) {
    setWidgets(widgets.filter((widget) => widget.id !== widgetId))
    markDirty()
  }

  const committedMaxRow = widgets
    .filter((w) => w.id !== activeWidgetId)
    .reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0)
  const rows = Math.max(2, committedMaxRow, liveMaxRow) + 1
  const gridPixelHeight = rows * ROW_HEIGHT + (rows + 1) * MARGIN[1]

  async function handleSave() {
    // Ghi trước rồi mới tắt chế độ sửa — tắt trước sẽ khiến effect đồng bộ kéo lại layout cũ trong
    // lúc request còn bay, board nháy về trạng thái trước đó.
    try {
      await onSave(widgets)
    } catch {
      return // giữ nguyên bản nháp để người dùng thử lại, không nuốt mất công sức
    }
    exitEdit()
  }

  function handleCancel() {
    if (dirty) {
      setIsCancelOpen(true)
      return
    }
    exitEdit()
  }

  /**
   * Mẫu được dựng ngay tại FE nên áp mẫu chỉ là thay bản nháp — chưa chạm tới server. Người dùng
   * xem kết quả rồi mới bấm Lưu, hoặc bấm Hủy để lấy lại bố cục cũ.
   */
  function handleApplyTemplate() {
    if (!pendingTemplate) return
    setWidgets(clampWidgets(pendingTemplate.widgets))
    markDirty()
    setPendingTemplate(null)
  }

  /**
   * Board theo nguồn chỉ dựng được widget bind kênh (VALUE/LINE), nên nguồn chưa có kênh nào thì hộp
   * thêm widget mở ra cũng chỉ để đóng lại — nói thẳng lý do. Board theo đơn vị thì vẫn mở được:
   * widget thiết bị (danh sách/trực tuyến) không cần kênh nào.
   */
  const canAddWidget = allowDeviceWidgets || datastreams.length > 0

  function startAddingWidget() {
    if (!canAddWidget) {
      toast.error('Chưa có thông tin để tạo widget')
      return
    }
    if (!editMode) toggleEditMode(boardKey)
    setIsAddWidgetOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {editMode && (
        <BoardEditToolbar
          onAddWidget={startAddingWidget}
          templates={templates}
          onSelectTemplate={setPendingTemplate}
          onCancel={handleCancel}
          onSave={handleSave}
          isSaving={isSaving}
          dirty={dirty}
        />
      )}

      {widgets.length === 0 && !editMode && (
        <EmptyState
          icon={LayoutGrid}
          title="Bảng điều khiển đang trống"
          description="Widget là các ô hiển thị số liệu, biểu đồ và công tắc điều khiển. Thêm widget đầu tiên để bắt đầu theo dõi."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={startAddingWidget}>
                <Plus data-icon="inline-start" />
                Thêm widget
              </Button>
              {/* Board rỗng thì áp mẫu nhanh hơn thêm tay từng kênh — nhưng vẫn vào chế độ sửa để
                  người dùng xem kết quả rồi mới quyết định giữ hay bỏ. */}
              {!!templates && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!templates.length) {
                      toast.error('Chưa có thông tin để tạo mẫu dashboard')
                      return
                    }
                    if (!editMode) toggleEditMode(boardKey)
                    setPendingTemplate(templates[0])
                  }}
                >
                  <Grid2x2Check data-icon="inline-start" />
                  Áp dụng mẫu
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* Khung bao: thanh công cụ ở trên dễ bị bỏ qua khi board dài. Chỉ viền đứt, KHÔNG tô nền —
          nền nhấn làm ô lưới (màu --muted) chìm hẳn, mất đúng thứ giúp căn widget lúc kéo. */}
      <div
        className={cn(
          'transition-colors duration-(--motion-base)',
          editMode && 'rounded-xl border-2 border-dashed border-primary/45 p-3'
        )}
      >
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={editMode ? { minHeight: gridPixelHeight } : undefined}
        >
        {mounted && (editMode || widgets.length > 0) && (
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
              compactor={FREE_LAYOUT_COMPACTOR}
              gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: MARGIN, maxRows: editMode ? rows : Infinity }}
              // cancel: bấm vào ô chọn khoảng / nút phóng to trong widget cũng bị RGL tính là một
              // cú kéo, thả chuột ra là widget nhảy chỗ.
              dragConfig={{ enabled: editMode, cancel: '.widget-no-drag' }}
              // Chỉ hai mép: phải kéo ngang, dưới kéo dọc. Bỏ góc `se` mặc định của RGL — kéo góc
              // luôn đổi đồng thời hai chiều, khó canh đúng một chiều.
              resizeConfig={{ enabled: editMode, handles: ['e', 's'] }}
              layout={widgets.map((widget) => {
                const spec = widgetSizeSpec(widget.type)
                return {
                  i: widget.id,
                  ...widget.layout,
                  minW: spec.minW,
                  maxW: spec.maxW,
                  minH: spec.minH,
                  maxH: spec.maxH,
                }
              })}
              onLayoutChange={handleLayoutChange}
              onDrag={handleDragOrResize}
              onDragStop={handleDragOrResizeStop}
              onResize={handleDragOrResize}
              onResizeStop={handleDragOrResizeStop}
            >
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  // Không `overflow-hidden` ở đây: dải resize nhô nửa ra ngoài mép nên sẽ bị cắt.
                  // Nội dung widget đã được chính `Widget` (rounded-xl + overflow-hidden) cắt rồi.
                  className={cn('group relative', editMode && 'cursor-grab active:cursor-grabbing')}
                >
                  {editMode && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity duration-(--motion-fast) hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-hover:opacity-100"
                          onClick={() => handleDeleteWidget(widget.id)}
                        >
                          <X className="size-3.5" />
                          <span className="sr-only">Xóa widget {widget.title}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Xóa widget</TooltipContent>
                    </Tooltip>
                  )}
                  <WidgetRenderer
                    widget={widget}
                    tenantNodeId={tenantNodeId}
                    datastreams={datastreamsByWidget.get(widget.id) ?? EMPTY_DATASTREAMS}
                    // Bind kênh nhưng KHÔNG kênh nào còn trong phạm vi board: đã chuyển đơn vị hoặc
                    // đã xoá. Widget vẫn vẽ nhưng đứng im — phải nói ra.
                    orphaned={
                      widgetDatastreamIds(widget).length > 0 &&
                      !widgetDatastreamIds(widget).some((id) => datastreamById.has(id))
                    }
                    readings={readings}
                    metricByCode={metricByCode}
                    commandUpdates={commandUpdates}
                  />
                </div>
              ))}
            </ReactGridLayout>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Rời khỏi bảng điều khiển?"
        question="Bạn đang chỉnh sửa và có thay đổi chưa lưu."
        description="Rời khỏi đây sẽ bỏ toàn bộ thay đổi vừa thực hiện: vị trí widget đã kéo, widget đã thêm hoặc đã xóa. Chọn Hủy rồi bấm Lưu nếu muốn giữ lại."
        confirmLabel="Rời và bỏ thay đổi"
        destructive
        onConfirm={() => {
          exitEdit()
          blocker.proceed?.()
        }}
      />

      <ConfirmDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Bỏ thay đổi bố cục?"
        question="Bạn đang có thay đổi chưa lưu."
        description="Vị trí widget đã kéo, widget vừa thêm hoặc vừa xóa sẽ mất. Bố cục quay lại lần lưu gần nhất."
        confirmLabel="Bỏ thay đổi"
        destructive
        onConfirm={() => {
          exitEdit()
          setIsCancelOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
        title={`Sử dụng mẫu ${pendingTemplate?.template.name ?? ''}`}
        description={`Xác nhận thay thế toàn bộ ${widgets.length} widget đang có trên bảng bằng ${pendingTemplate?.widgets.length ?? 0} widget của mẫu: ${describeWidgets(pendingTemplate?.widgets ?? [])}. Bố cục mới chưa ghi xuống server — bấm Hủy để lấy lại bố cục cũ.`}
        onConfirm={handleApplyTemplate}
      />

      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
        datastreams={datastreams}
        tenantNodeId={tenantNodeId}
        onAdd={handleAddWidget}
        allowDeviceWidgets={allowDeviceWidgets}
      />
    </div>
  )
}

// memo — board re-render liên tục lúc kéo/resize (track liveMaxRow qua onDrag/onResize),
// không memo thì mọi widget khác cũng re-render theo dù props không đổi, gây nháy (đặc biệt
// rõ với ECharts).
const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  tenantNodeId,
  datastreams,
  orphaned,
  readings,
  metricByCode,
  commandUpdates,
}: {
  widget: WidgetT
  tenantNodeId: number
  /** Mọi kênh widget đang bind, đã lọc bỏ kênh ngoài phạm vi board. */
  datastreams: Datastream[]
  orphaned?: boolean
  readings: Record<number, DatastreamReading>
  metricByCode: Map<string, Metric>
  commandUpdates: Record<string, CommandUpdate>
}) {
  switch (widget.type) {
    case 'VALUE':
      return (
        <ValueWidget
          widget={widget}
          datastreams={datastreams}
          orphaned={orphaned}
          readings={readings}
          metricByCode={metricByCode}
        />
      )
    case 'LINE':
      return <LineWidget widget={widget} datastreams={datastreams} orphaned={orphaned} readings={readings} />
    case 'DEVICE_LIST':
      return <DeviceListWidget widget={widget} tenantNodeId={tenantNodeId} />
    case 'DEVICES_ONLINE':
      return <DevicesOnlineWidget widget={widget} tenantNodeId={tenantNodeId} />
    case 'SWITCH':
      return <SwitchWidget widget={widget} commandUpdates={commandUpdates} />
    default:
      return null
  }
})
