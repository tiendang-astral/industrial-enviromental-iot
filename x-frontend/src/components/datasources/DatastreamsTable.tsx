import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { useDeleteDatastreamMutation } from '@/queries/useDeleteDatastreamMutation'
import type { Datastream } from '@/types/dashboard'
import type { Metric } from '@/types/metric'

export function DatastreamsTable({
  externalSourceId,
  datastreams,
  metrics,
}: {
  externalSourceId: number
  datastreams: Datastream[]
  metrics: Metric[]
}) {
  const deleteMutation = useDeleteDatastreamMutation(externalSourceId)
  const [deleteTarget, setDeleteTarget] = useState<Datastream | null>(null)

  function metricLabel(metricId: number) {
    const metric = metrics.find((item) => item.id === metricId)
    return metric ? `${metric.name} (${metric.unit})` : `#${metricId}`
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Đã xóa datastream')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa datastream thất bại')),
    })
  }

  const columns: DataTableColumn<Datastream>[] = [
    {
      key: 'name',
      header: 'Tên datastream',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'sourceField',
      header: 'Cột nguồn',
      cell: (row) => <span className="text-muted-foreground">{row.sourceField ?? '—'}</span>,
    },
    {
      key: 'metric',
      header: 'Metric',
      cell: (row) => <span className="text-muted-foreground">{metricLabel(row.metricId)}</span>,
    },
    {
      key: 'latestValue',
      header: 'Giá trị hiện tại',
      className: 'font-medium tabular',
      cell: (row) =>
        row.latestValue != null
          ? `${row.latestValue}${row.metricUnit ? ` ${row.metricUnit}` : ''}`
          : '—',
    },
    {
      key: 'latestMeasuredAt',
      header: 'Cập nhật gần nhất',
      className: 'text-muted-foreground tabular',
      cell: (row) => (row.latestMeasuredAt ? formatDateTime(row.latestMeasuredAt) : 'Chưa có dữ liệu'),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Hành động</span>,
      headerClassName: 'w-12',
      cell: (row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 />
              <span className="sr-only">Xóa datastream {row.name}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xóa datastream</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={datastreams}
        getRowId={(row) => row.id}
        pageSize={10}
        empty={
          <EmptyState
            icon={Waves}
            title="Chưa có datastream nào"
            description="Job đang đọc dữ liệu nhưng chưa cột nào được gắn vào metric, nên dashboard chưa hiển thị được gì."
          />
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa datastream này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        description="Datastream sẽ bị gỡ khỏi job. Widget đang dùng datastream này sẽ mất dữ liệu. Số liệu đã ghi vào InfluxDB vẫn giữ nguyên."
        confirmLabel="Xóa datastream"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
