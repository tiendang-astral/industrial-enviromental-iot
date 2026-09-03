import { useState } from 'react'
import { toast } from 'sonner'
import { CircuitBoard, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PIN_TYPE_LABEL } from '@/lib/pinLabels'
import { EmptyState } from '@/components/patterns/EmptyState'
import { getApiErrorMessage } from '@/lib/apiError'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useDeleteGatewayPinMutation } from '@/queries/useDeleteGatewayPinMutation'
import { useUpdateGatewayPinMutation } from '@/queries/useUpdateGatewayPinMutation'
import { EditPinDialog } from '@/components/devices/EditPinDialog'
import type { GatewayPin } from '@/types/gatewayPin'

export function GatewayPinsTable({ gatewayId }: { gatewayId: number }) {
  const { data: pins, isLoading } = useGatewayPinsQuery(gatewayId)
  const { data: metrics } = useMetricsQuery()
  const updateMutation = useUpdateGatewayPinMutation(gatewayId)
  const deleteMutation = useDeleteGatewayPinMutation(gatewayId)
  const [editTarget, setEditTarget] = useState<GatewayPin | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GatewayPin | null>(null)

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Đã xóa pin')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa pin thất bại')),
    })
  }

  function metricLabel(metricId: number | null) {
    if (metricId == null) return '—'
    const metric = metrics?.find((item) => item.id === metricId)
    return metric ? `${metric.name} (${metric.unit})` : `#${metricId}`
  }

  function toggleEnabled(pin: GatewayPin) {
    updateMutation.mutate(
      { pinId: pin.id, payload: { enabled: !pin.enabled } },
      {
        onSuccess: () => toast.success(pin.enabled ? `Đã tắt ${pin.name}` : `Đã bật ${pin.name}`),
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật pin thất bại')),
      }
    )
  }

  const columns: DataTableColumn<GatewayPin>[] = [
    {
      key: 'name',
      header: 'Tên',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Loại',
      cell: (row) => (
        <EnumBadge>{PIN_TYPE_LABEL[row.type]}</EnumBadge>
      ),
    },
    {
      key: 'pinNumber',
      header: 'Chân',
      className: 'tabular',
      cell: (row) => row.pinNumber,
    },
    {
      key: 'metric',
      header: 'Metric',
      className: 'text-muted-foreground',
      cell: (row) => metricLabel(row.metricId),
    },
    {
      key: 'enabled',
      // Không bọc Switch trong TooltipTrigger asChild: Radix merge data-state/data-checked của
      // tooltip đè lên của switch, làm mất nền màu trạng thái bật. Chú thích đặt ở header.
      header: (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help underline decoration-dotted underline-offset-4">
              Đang bật
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Tắt pin thì ngừng nhận dữ liệu, widget đang gắn vẫn giữ nguyên liên kết.
          </TooltipContent>
        </Tooltip>
      ),
      headerClassName: 'w-24',
      cell: (row) => (
        <Switch
          checked={row.enabled}
          disabled={updateMutation.isPending}
          onCheckedChange={() => toggleEnabled(row)}
          aria-label={`Bật/tắt pin ${row.name}`}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Hành động',
      headerClassName: 'w-40 text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditTarget(row)}
          >
            <Pencil data-icon="inline-start" />
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 data-icon="inline-start" />
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={pins}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        pageSize={10}
        empty={<EmptyState icon={CircuitBoard} title="Chưa có pin nào" />}
      />

      <EditPinDialog
        gatewayId={gatewayId}
        pin={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa pin này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        description="Pin và kênh dữ liệu gắn với nó sẽ bị xóa vĩnh viễn. Widget dashboard đang dùng kênh này sẽ mất nguồn. Số liệu đã ghi vào InfluxDB vẫn giữ nguyên. Muốn tạm ngừng nhận dữ liệu thì dùng công tắc ở cột Đang bật thay vì xóa."
        confirmLabel="Xóa pin"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
