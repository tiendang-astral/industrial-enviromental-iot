import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { BackfillDialog } from '@/components/datasources/BackfillDialog'
import { DatastreamFormDialog } from '@/components/datasources/DatastreamFormDialog'
import { JobDataTable } from '@/components/datasources/JobDataTable'
import { JobDatastreamsTable } from '@/components/datasources/JobDatastreamsTable'
import { JobEditorDialog } from '@/components/datasources/JobEditorDialog'
import { JobMetaBar } from '@/components/datasources/JobMetaBar'
import { JobOverview } from '@/components/datasources/JobOverview'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useDeleteDatastreamMutation } from '@/queries/useDeleteDatastreamMutation'
import { useDeleteExternalSourceJobMutation } from '@/queries/useDeleteExternalSourceJobMutation'
import { useExternalSourceJobsQuery } from '@/queries/useExternalSourceJobsQuery'
import { useJobSampleQuery } from '@/queries/useJobSampleQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useRunJobNowMutation } from '@/queries/useRunJobNowMutation'
import { useSourceTelemetryQuery } from '@/queries/useSourceTelemetryQuery'
import type { Datastream } from '@/types/dashboard'
import type { PreviewColumn } from '@/types/externalSource'

const SAMPLE_ROWS = 200

export default function JobDetailPage() {
  const { sourceId, jobId, tab } = useParams()
  const externalSourceId = Number(sourceId)
  const id = Number(jobId)
  const navigate = useNavigate()
  const activeTab = tab === 'overview' ? 'overview' : 'config'

  const { data: jobs, isLoading: jobsLoading } = useExternalSourceJobsQuery(externalSourceId)
  const job = jobs?.find((item) => item.id === id)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const {
    data: telemetry,
    isLoading: telemetryLoading,
    error: telemetryError,
  } = useSourceTelemetryQuery(externalSourceId)
  const { data: metrics } = useMetricsQuery()
  const sampleQuery = useJobSampleQuery(id, SAMPLE_ROWS)

  const runNowMutation = useRunJobNowMutation(externalSourceId)
  const deleteJobMutation = useDeleteExternalSourceJobMutation(externalSourceId)
  const deleteDatastreamMutation = useDeleteDatastreamMutation(externalSourceId)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteJobOpen, setIsDeleteJobOpen] = useState(false)
  const [bindColumn, setBindColumn] = useState<PreviewColumn | null>(null)
  const [unbindTarget, setUnbindTarget] = useState<Datastream | null>(null)
  const [backfillTarget, setBackfillTarget] = useState<Datastream | null>(null)

  const jobDatastreams = datastreams?.filter((item) => item.sourceId === id) ?? []
  const jobDatastreamIds = new Set(jobDatastreams.map((item) => item.id))
  const jobTelemetry = (telemetry ?? []).filter((item) => jobDatastreamIds.has(item.datastreamId))

  function handleRunNow() {
    runNowMutation.mutate(id, {
      onSuccess: () => toast.success('Đã xếp lịch chạy — job sẽ chạy trong ít giây'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Không xếp được lịch chạy')),
    })
  }

  function confirmDeleteJob() {
    deleteJobMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Đã xóa job')
        navigate(`/data-sources/${externalSourceId}/config`)
      },
      onError: (error) => {
        setIsDeleteJobOpen(false)
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — job còn kênh dữ liệu'))
      },
    })
  }

  function confirmUnbind() {
    if (!unbindTarget) return
    deleteDatastreamMutation.mutate(unbindTarget.id, {
      onSuccess: () => {
        setUnbindTarget(null)
        toast.success('Đã xóa kênh dữ liệu')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa kênh thất bại')),
    })
  }

  if (jobsLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!job) {
    return (
      <EmptyState
        icon={Unplug}
        title="Không tìm thấy job"
        description="Job này có thể đã bị xóa hoặc thuộc một nguồn khác."
        action={
          <Button variant="outline" asChild>
            <Link to={`/data-sources/${externalSourceId}/config`}>Về danh sách job</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab nằm trong URL và đặt vào slot actions của PageHeader — giống hệt trang chi tiết nguồn,
          để hai cấp (nguồn / job) điều hướng cùng một kiểu. */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          navigate(`/data-sources/${externalSourceId}/jobs/${id}/${value}`)
        }
        className="gap-6"
      >
        <PageHeader
          title={`Job ${job.name}`}
          backTo={`/data-sources/${externalSourceId}/config`}
          actions={
            <TabsList>
              <TabsTrigger value="config">Cấu hình</TabsTrigger>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            </TabsList>
          }
        />

        <JobMetaBar
          job={job}
          onRunNow={handleRunNow}
          onEdit={() => setIsEditOpen(true)}
          onDelete={() => setIsDeleteJobOpen(true)}
          isRunPending={runNowMutation.isPending}
        />

        <TabsContent value="config" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-medium">Câu truy vấn</h2>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[12px] leading-[1.7]">
              {job.queryConfig.sql}
            </pre>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-medium">Dữ liệu đọc được</h2>
              {sampleQuery.data && (
                <span className="tabular text-xs text-muted-foreground">
                  {sampleQuery.data.rowCount} dòng mới nhất
                </span>
              )}
            </div>
            <JobDataTable
              result={sampleQuery.data ?? null}
              isLoading={sampleQuery.isLoading}
              error={
                sampleQuery.error
                  ? getApiErrorMessage(sampleQuery.error, 'Không chạy được truy vấn của job')
                  : null
              }
              timestampColumn={job.queryConfig.timestampColumn}
              datastreams={jobDatastreams}
              onBind={setBindColumn}
            />
          </div>

          {jobDatastreams.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-medium">Kênh dữ liệu</h2>
              <JobDatastreamsTable
                datastreams={jobDatastreams}
                telemetry={telemetry ?? []}
                onUnbind={setUnbindTarget}
                onBackfill={setBackfillTarget}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview">
          <JobOverview
            job={job}
            telemetry={jobTelemetry}
            telemetryLoading={telemetryLoading}
            telemetryError={telemetryError}
            onCreateChannel={() =>
              navigate(`/data-sources/${externalSourceId}/jobs/${id}/config`)
            }
          />
        </TabsContent>
      </Tabs>

      <JobEditorDialog
        externalSourceId={externalSourceId}
        job={job}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <DatastreamFormDialog
        externalSourceId={externalSourceId}
        job={job}
        column={bindColumn}
        metrics={metrics ?? []}
        existingNames={datastreams?.map((item) => item.name) ?? []}
        open={!!bindColumn}
        onOpenChange={(open) => !open && setBindColumn(null)}
      />

      {backfillTarget && (
        <BackfillDialog
          datastream={backfillTarget}
          externalSourceId={externalSourceId}
          open
          onOpenChange={(open) => !open && setBackfillTarget(null)}
        />
      )}

      <ConfirmDialog
        open={isDeleteJobOpen}
        onOpenChange={setIsDeleteJobOpen}
        title="Xóa job này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa job{' '}
            <span className="font-semibold">&ldquo;{job.name}&rdquo;</span>?
          </>
        }
        description="Cần xóa các kênh dữ liệu của job này trước."
        confirmLabel="Xóa job"
        destructive
        isPending={deleteJobMutation.isPending}
        onConfirm={confirmDeleteJob}
      />

      <ConfirmDialog
        open={!!unbindTarget}
        onOpenChange={(open) => !open && setUnbindTarget(null)}
        title="Xóa kênh dữ liệu này?"
        question={
          <>
            Xóa kênh <span className="font-semibold">&ldquo;{unbindTarget?.name}&rdquo;</span>?
          </>
        }
        description="Widget dashboard đang bind kênh này sẽ mất liên kết và cần gắn lại thủ công. Dữ liệu đã ghi vào InfluxDB không bị xóa."
        confirmLabel="Xóa kênh"
        destructive
        isPending={deleteDatastreamMutation.isPending}
        onConfirm={confirmUnbind}
      />
    </div>
  )
}
