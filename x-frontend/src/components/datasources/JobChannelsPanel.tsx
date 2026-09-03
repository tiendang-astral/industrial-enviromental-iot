import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { ColumnBindCard } from '@/components/datasources/ColumnBindCard'
import { DatastreamFormDialog } from '@/components/datasources/DatastreamFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDeleteDatastreamMutation } from '@/queries/useDeleteDatastreamMutation'
import { usePreviewQueryMutation } from '@/queries/usePreviewQueryMutation'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob, PreviewColumn, PreviewResult } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

/**
 * Cột hợp lệ để gắn kênh = cột thật trong kết quả truy vấn, nên panel phải chạy thử một lần khi
 * mở ra. Nếu truy vấn hỏng thì nói thẳng thay vì hiện danh sách cột cũ đã sai.
 */
export function JobChannelsPanel({
  externalSourceId,
  job,
  datastreams,
  metrics,
}: {
  externalSourceId: number
  job: ExternalSourceJob
  datastreams: Datastream[]
  metrics: Metric[]
}) {
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bindColumn, setBindColumn] = useState<PreviewColumn | null>(null)
  const [unbindTarget, setUnbindTarget] = useState<Datastream | null>(null)

  const previewMutation = usePreviewQueryMutation(externalSourceId)
  const deleteMutation = useDeleteDatastreamMutation(externalSourceId)
  const { mutate: runPreview } = previewMutation

  useEffect(() => {
    runPreview(
      { sql: job.queryConfig.sql, timestampColumn: job.queryConfig.timestampColumn },
      {
        onSuccess: (result) => {
          setPreview(result)
          setError(null)
        },
        onError: (mutationError) => {
          setPreview(null)
          setError(getApiErrorMessage(mutationError, 'Không chạy được truy vấn của job'))
        },
      }
    )
  }, [runPreview, job.queryConfig.sql, job.queryConfig.timestampColumn])

  function confirmUnbind() {
    if (!unbindTarget) return
    deleteMutation.mutate(unbindTarget.id, {
      onSuccess: () => {
        setUnbindTarget(null)
        toast.success('Đã bỏ gán kênh dữ liệu')
      },
      onError: (mutationError) => toast.error(getApiErrorMessage(mutationError, 'Bỏ gán thất bại')),
    })
  }

  if (previewMutation.isPending && !preview) {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Không lấy được danh sách cột</AlertTitle>
        <AlertDescription className="font-mono text-xs whitespace-pre-wrap">{error}</AlertDescription>
      </Alert>
    )
  }

  if (!preview) return null

  const orphaned = datastreams.filter(
    (datastream) =>
      datastream.sourceField &&
      !preview.columns.some((column) => column.name.toLowerCase() === datastream.sourceField!.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      {orphaned.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{orphaned.length} kênh đang treo</AlertTitle>
          <AlertDescription>
            Truy vấn hiện tại không còn cột{' '}
            <span className="font-mono">{orphaned.map((item) => item.sourceField).join(', ')}</span>. Widget đang bind
            các kênh này sẽ không nhận dữ liệu mới. Sửa lại truy vấn hoặc bỏ gán kênh.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {preview.columns.map((column, index) => (
          <ColumnBindCard
            key={column.name}
            column={column}
            preview={preview}
            columnIndex={index}
            isTimestamp={column.name.toLowerCase() === job.queryConfig.timestampColumn.toLowerCase()}
            datastream={
              datastreams.find(
                (item) => item.sourceField?.toLowerCase() === column.name.toLowerCase()
              ) ?? null
            }
            metrics={metrics}
            onBind={setBindColumn}
            onUnbind={setUnbindTarget}
          />
        ))}
      </div>

      <DatastreamFormDialog
        externalSourceId={externalSourceId}
        job={job}
        column={bindColumn}
        metrics={metrics}
        open={!!bindColumn}
        onOpenChange={(open) => !open && setBindColumn(null)}
      />

      <ConfirmDialog
        open={!!unbindTarget}
        onOpenChange={(open) => !open && setUnbindTarget(null)}
        title="Bỏ gán kênh dữ liệu này?"
        question={
          <>
            Bỏ gán <span className="font-semibold">&ldquo;{unbindTarget?.name}&rdquo;</span>?
          </>
        }
        description="Kênh bị xóa khỏi hệ thống. Widget dashboard đang bind kênh này sẽ mất liên kết và cần gắn lại thủ công. Dữ liệu đã ghi vào InfluxDB không bị xóa."
        confirmLabel="Bỏ gán"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmUnbind}
      />
    </div>
  )
}
