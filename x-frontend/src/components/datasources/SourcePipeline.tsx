import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DatabasePlus, DatabaseZap, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { DatastreamDetailDialog } from '@/components/datasources/DatastreamDetailDialog'
import { JobBlock } from '@/components/datasources/JobBlock'
import { JobDetailDialog } from '@/components/datasources/JobDetailDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useDeleteExternalSourceJobMutation } from '@/queries/useDeleteExternalSourceJobMutation'
import { useRunJobNowMutation } from '@/queries/useRunJobNowMutation'
import { useSourceJobRunsQuery } from '@/queries/useSourceJobRunsQuery'
import { useSourceTelemetryQuery } from '@/queries/useSourceTelemetryQuery'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob } from '@/types/externalSource'

/** Dưới ngưỡng này thì ô tìm kiếm chỉ tổ chiếm chỗ — mắt quét nhanh hơn gõ. */
const SEARCH_THRESHOLD = 6

/**
 * Toàn bộ một nguồn trên một màn hình: mỗi job là một khối kèm các kênh nó sinh ra.
 * Thay cho bốn đường dẫn cũ (tab Cấu hình, tab Tổng quan, trang job, tab của trang job) —
 * chi tiết giờ nằm trong modal mở tại chỗ, không rời trang.
 */
export function SourcePipeline({
  externalSourceId,
  jobs,
  isLoading,
  onAddJob,
}: {
  externalSourceId: number
  jobs: ExternalSourceJob[]
  isLoading: boolean
  onAddJob: () => void
}) {
  const [query, setQuery] = useState('')
  const [openJobId, setOpenJobId] = useState<number | null>(null)
  const [deletingJob, setDeletingJob] = useState<ExternalSourceJob | null>(null)
  const [selectedDatastream, setSelectedDatastream] = useState<Datastream | null>(null)

  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { data: telemetry } = useSourceTelemetryQuery(externalSourceId)
  const { data: runsByJob, isLoading: runsLoading } = useSourceJobRunsQuery(externalSourceId)

  const runNowMutation = useRunJobNowMutation(externalSourceId)
  const deleteJobMutation = useDeleteExternalSourceJobMutation(externalSourceId)

  // Kênh lấy từ Postgres chứ không từ telemetry: kênh vừa tạo chưa có điểm nào trong InfluxDB,
  // đi theo telemetry thì nó biến mất khỏi pipeline đúng lúc người dùng vừa tạo xong.
  const datastreamsByJob = useMemo(() => {
    const map = new Map<number, Datastream[]>()
    ;(datastreams ?? []).forEach((item) => {
      const list = map.get(item.sourceId) ?? []
      list.push(item)
      map.set(item.sourceId, list)
    })
    return map
  }, [datastreams])

  const telemetryById = useMemo(
    () => new Map((telemetry ?? []).map((item) => [item.datastreamId, item])),
    [telemetry],
  )

  const allNames = useMemo(() => (datastreams ?? []).map((item) => item.name), [datastreams])

  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return jobs
    return jobs.filter((job) => job.name.toLowerCase().includes(needle))
  }, [jobs, query])

  const openJob = jobs.find((job) => job.id === openJobId) ?? null

  function handleRunNow(job: ExternalSourceJob) {
    runNowMutation.mutate(job.id, {
      onSuccess: () => toast.success('Đã yêu cầu kéo dữ liệu mới — kết quả về trong khoảng 15 giây'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Không xếp được lượt chạy')),
    })
  }

  function confirmDeleteJob() {
    if (!deletingJob) return
    deleteJobMutation.mutate(deletingJob.id, {
      onSuccess: () => {
        if (openJobId === deletingJob.id) setOpenJobId(null)
        setDeletingJob(null)
        toast.success('Đã xóa truy vấn')
      },
      onError: (error) => {
        setDeletingJob(null)
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — truy vấn còn kênh dữ liệu gắn vào'))
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Chưa có truy vấn nào"
        description="Tạo truy vấn định kỳ để đọc dữ liệu realtime từ nguồn."
        action={
          <Button size="lg" onClick={onAddJob}>
            <DatabasePlus data-icon="inline-start" />
            Thêm truy vấn định kỳ
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {jobs.length > SEARCH_THRESHOLD && (
        <div className="relative max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm truy vấn theo tên"
            aria-label="Tìm truy vấn theo tên"
            className="pl-9"
          />
        </div>
      )}

      {visibleJobs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Không có truy vấn nào khớp"
          description={`Không tìm thấy truy vấn nào có tên chứa “${query.trim()}”.`}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Đường kẻ mảnh giữa các pipeline: khoảng trắng không thôi thì hai truy vấn liền nhau
              dính thành một mảng khối, không rõ đâu là hết cái này sang cái kia. */}
          {visibleJobs.map((job, index) => (
            <div key={job.id} className={cn(index > 0 && 'border-t border-border pt-6')}>
              <JobBlock
                job={job}
                datastreams={datastreamsByJob.get(job.id) ?? []}
                telemetryById={telemetryById}
                runs={runsByJob?.get(job.id) ?? []}
                runsLoading={runsLoading}
                onOpenJob={() => setOpenJobId(job.id)}
                onDeleteJob={() => setDeletingJob(job)}
                onSelectDatastream={setSelectedDatastream}
                // Tạo kênh phải chọn một cột, mà bảng cột nằm trong modal chi tiết — mở thẳng nó
                // thay vì dựng một hộp thoại nửa vời không có dữ liệu để chọn.
                onAddChannel={() => setOpenJobId(job.id)}
              />
            </div>
          ))}

          <div className="flex w-full justify-center border-t border-border pt-6">
            <Button
              size="lg"
              onClick={onAddJob}
              className="mx-auto h-12 w-fit gap-2.5 px-7 text-[15px] font-medium shadow-sm"
            >
              <DatabasePlus data-icon="inline-start" />
              Thêm truy vấn định kỳ
            </Button>
          </div>
        </div>
      )}

      <JobDetailDialog
        job={openJob}
        externalSourceId={externalSourceId}
        datastreams={openJob ? (datastreamsByJob.get(openJob.id) ?? []) : []}
        allDatastreamNames={allNames}
        runs={openJob ? (runsByJob?.get(openJob.id) ?? []) : []}
        runsLoading={runsLoading}
        isRunPending={runNowMutation.isPending}
        open={!!openJob}
        onOpenChange={(next) => !next && setOpenJobId(null)}
        onRunNow={() => openJob && handleRunNow(openJob)}
        onSelectDatastream={setSelectedDatastream}
      />

      <DatastreamDetailDialog
        datastream={selectedDatastream}
        job={jobs.find((job) => job.id === selectedDatastream?.sourceId) ?? null}
        telemetry={selectedDatastream ? (telemetryById.get(selectedDatastream.id) ?? null) : null}
        externalSourceId={externalSourceId}
        open={!!selectedDatastream}
        onOpenChange={(next) => !next && setSelectedDatastream(null)}
      />

      <ConfirmDialog
        open={!!deletingJob}
        onOpenChange={(next) => !next && setDeletingJob(null)}
        title="Xóa truy vấn này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa truy vấn{' '}
            <span className="font-semibold">&ldquo;{deletingJob?.name}&rdquo;</span>?
          </>
        }
        description="Cần xóa các kênh dữ liệu của truy vấn này trước."
        confirmLabel="Xóa truy vấn"
        destructive
        isPending={deleteJobMutation.isPending}
        onConfirm={confirmDeleteJob}
      />
    </div>
  )
}
