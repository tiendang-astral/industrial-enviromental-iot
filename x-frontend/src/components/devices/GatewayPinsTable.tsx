import { toast } from 'sonner'
import { CircuitBoard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { getApiErrorMessage } from '@/lib/apiError'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useUpdateGatewayPinMutation } from '@/queries/useUpdateGatewayPinMutation'
import type { GatewayPin } from '@/types/gatewayPin'

export function GatewayPinsTable({ gatewayId }: { gatewayId: number }) {
  const { data: pins, isLoading } = useGatewayPinsQuery(gatewayId)
  const { data: metrics } = useMetricsQuery()
  const updateMutation = useUpdateGatewayPinMutation(gatewayId)

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
      sortValue: (row) => row.name,
    },
    {
      key: 'type',
      header: 'Loại',
      cell: (row) => (
        <Badge variant="outline">
          {row.direction === 'INPUT' ? 'Đọc' : 'Điều khiển'} · {row.type}
        </Badge>
      ),
      sortValue: (row) => `${row.direction}${row.type}`,
    },
    {
      key: 'pinNumber',
      header: 'Chân',
      className: 'tabular',
      cell: (row) => row.pinNumber,
      sortValue: (row) => row.pinNumber,
    },
    {
      key: 'metric',
      header: 'Metric',
      className: 'text-muted-foreground',
      cell: (row) => metricLabel(row.metricId),
      sortValue: (row) => metricLabel(row.metricId),
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
  ]

  return (
    <DataTable
      columns={columns}
      rows={pins}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      pageSize={10}
      empty={
        <EmptyState
          icon={CircuitBoard}
          title="Chưa có pin nào"
          description="Pin ánh xạ từng chân vật lý của gateway sang một metric. Chưa khai báo pin thì dữ liệu gửi lên sẽ bị bỏ qua."
        />
      }
    />
  )
}
