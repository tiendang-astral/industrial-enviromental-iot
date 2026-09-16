import { useState } from 'react'
import { toast } from 'sonner'
import { Gauge, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { MetricFormDialog } from '@/components/metrics/MetricFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { metricChipStyle, metricColorVar } from '@/lib/metricColors'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import {
  useDeleteMetricMutation,
  useResetMetricThresholdMutation,
} from '@/queries/useMetricMutations'
import type { Metric } from '@/types/metric'

function thresholdLabel(metric: Metric) {
  if (metric.minValue == null || metric.maxValue == null) return null
  return `${metric.minValue} – ${metric.maxValue} ${metric.unit}`.trim()
}

export function MetricsTab({
  createOpen,
  onCreateOpenChange,
}: {
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}) {
  const { data: metrics, isLoading } = useMetricsQuery()
  const [editTarget, setEditTarget] = useState<Metric | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Metric | null>(null)
  const [resetTarget, setResetTarget] = useState<Metric | null>(null)

  const deleteMutation = useDeleteMetricMutation()
  const resetMutation = useResetMetricThresholdMutation()

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Đã xóa chỉ số')
      },
      onError: (error) => {
        setDeleteTarget(null)
        toast.error(getApiErrorMessage(error, 'Xóa chỉ số thất bại'))
      },
    })
  }

  function confirmReset() {
    if (!resetTarget) return
    resetMutation.mutate(resetTarget.id, {
      onSuccess: () => {
        setResetTarget(null)
        toast.success('Đã khôi phục ngưỡng mặc định')
      },
      onError: (error) => {
        setResetTarget(null)
        toast.error(getApiErrorMessage(error, 'Khôi phục thất bại'))
      },
    })
  }

  const columns: DataTableColumn<Metric>[] = [
    {
      key: 'name',
      header: 'Tên chỉ số',
      filter: { type: 'text', placeholder: 'Tìm kiếm', getValue: (row) => `${row.name} ${row.code}` },
      cell: (row) => {
        const color = metricColorVar(row.code, row.color)
        return (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color ?? 'var(--foreground-subtle)' }}
            />
            <span className="font-medium">{row.name}</span>
          </span>
        )
      },
    },
    {
      key: 'unit',
      header: 'Đơn vị',
      className: 'text-muted-foreground',
      cell: (row) => row.unit,
    },
    {
      key: 'threshold',
      header: 'Ngưỡng',
      filter: {
        type: 'select',
        placeholder: 'Ngưỡng',
        getValue: (row) => (row.thresholdOverridden ? 'SET' : 'UNSET'),
        options: [
          { value: 'SET', label: 'Đã đặt' },
          { value: 'UNSET', label: 'Chưa đặt' },
        ],
      },
      cell: (row) => {
        const label = thresholdLabel(row)
        if (!label) return <span className="text-muted-foreground">Chưa đặt</span>
        const color = metricColorVar(row.code, row.color)
        return (
          <span className="tabular" style={color ? metricChipStyle(color) : undefined}>
            <span className="rounded-md px-1.5 py-0.5">{label}</span>
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Hành động',
      headerClassName: 'w-44 text-right',
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!row.thresholdOverridden}
                onClick={() => setResetTarget(row)}
              >
                <RotateCcw />
                <span className="sr-only">Khôi phục ngưỡng mặc định cho {row.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {row.thresholdOverridden ? 'Khôi phục ngưỡng mặc định' : 'Chưa đặt ngưỡng riêng'}
            </TooltipContent>
          </Tooltip>
          {row.custom && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 data-icon="inline-start" />
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        rows={metrics}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        pageSize={20}
        empty={
          <EmptyState
            icon={Gauge}
            title="Chưa có chỉ số nào"
            description="Thêm chỉ số riêng cho công ty bằng nút ở trên."
          />
        }
      />

      <MetricFormDialog open={createOpen} metric={null} onOpenChange={onCreateOpenChange} />
      <MetricFormDialog
        open={!!editTarget}
        metric={editTarget}
        onOpenChange={(next) => !next && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Xóa chỉ số này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa chỉ số{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        description="Chỉ xóa được khi chưa có chân cảm biến, kênh dữ liệu hay quy tắc cảnh báo nào dùng tới."
        confirmLabel="Xóa chỉ số"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(next) => !next && setResetTarget(null)}
        title="Khôi phục ngưỡng mặc định?"
        question={
          <>
            Bỏ ngưỡng riêng của chỉ số{' '}
            <span className="font-semibold">&ldquo;{resetTarget?.name}&rdquo;</span>?
          </>
        }
        description="Chỉ số này sẽ không còn được tô màu cảnh báo cho tới khi bạn đặt ngưỡng mới."
        confirmLabel="Khôi phục"
        isPending={resetMutation.isPending}
        onConfirm={confirmReset}
      />
    </div>
  )
}
