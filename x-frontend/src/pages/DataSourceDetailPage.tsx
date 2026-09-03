import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DatabaseZap, LayoutDashboard, Pencil, Plus, Trash2, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { EditSourceDialog } from '@/components/datasources/EditSourceDialog'
import { JobCard } from '@/components/datasources/JobCard'
import { JobEditorDialog } from '@/components/datasources/JobEditorDialog'
import { SourceInfoCard } from '@/components/datasources/SourceInfoCard'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useDeleteExternalSourceMutation } from '@/queries/useDeleteExternalSourceMutation'
import { useExternalSourceJobsQuery } from '@/queries/useExternalSourceJobsQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

export default function DataSourceDetailPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)
  const navigate = useNavigate()

  const { data: sources, isLoading: sourcesLoading } = useExternalSourcesQuery()
  const source = sources?.find((item) => item.id === externalSourceId)
  const { data: nodes } = useTenantNodesQuery()
  const { data: jobs, isLoading: jobsLoading } = useExternalSourceJobsQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { data: metrics } = useMetricsQuery()

  const deleteSourceMutation = useDeleteExternalSourceMutation()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  function confirmDeleteSource() {
    deleteSourceMutation.mutate(externalSourceId, {
      onSuccess: () => {
        toast.success('Đã xóa nguồn dữ liệu')
        navigate('/data-sources')
      },
      onError: (error) => {
        setIsDeleteOpen(false)
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — nguồn còn job gắn vào'))
      },
    })
  }

  if (sourcesLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!source) {
    return (
      <EmptyState
        icon={Unplug}
        title="Không tìm thấy nguồn dữ liệu"
        description="Nguồn này có thể đã bị xóa hoặc bạn không còn quyền truy cập đơn vị chứa nó."
        action={
          <Button variant="outline" asChild>
            <Link to="/data-sources">Về danh sách nguồn</Link>
          </Button>
        }
      />
    )
  }

  const nodeName =
    nodes?.find((node) => node.id === source.tenantNodeId)?.name ?? `#${source.tenantNodeId}`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={source.name}
        description="PostgreSQL ngoài. Mỗi job là một câu truy vấn chạy theo lịch; mỗi cột trong kết quả gắn được vào một metric thành kênh dữ liệu."
        backTo="/data-sources"
        backLabel="Nguồn dữ liệu"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/dashboard/source/${externalSourceId}`}>
                <LayoutDashboard data-icon="inline-start" />
                Xem dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Sửa
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 data-icon="inline-start" />
              Xóa
            </Button>
          </>
        }
      />

      <SourceInfoCard source={source} nodeName={nodeName} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">
          Job đồng bộ
          {jobs && jobs.length > 0 && (
            <span className="ml-2 text-sm text-muted-foreground tabular">{jobs.length}</span>
          )}
        </h2>
        <Button onClick={() => setIsCreateJobOpen(true)}>
          <Plus data-icon="inline-start" />
          Thêm job
        </Button>
      </div>

      {jobsLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!jobsLoading && (jobs?.length ?? 0) === 0 && (
        <EmptyState
          icon={DatabaseZap}
          title="Chưa có job nào"
          description="Job quyết định truy vấn nào được chạy và chạy bao lâu một lần. Chưa có job thì nguồn này chưa đưa dữ liệu nào về hệ thống."
          action={
            <Button variant="outline" onClick={() => setIsCreateJobOpen(true)}>
              Thêm job đầu tiên
            </Button>
          }
        />
      )}

      {jobs?.map((job) => (
        <JobCard
          key={job.id}
          externalSourceId={externalSourceId}
          job={job}
          datastreams={datastreams?.filter((item) => item.sourceId === job.id) ?? []}
          metrics={metrics ?? []}
        />
      ))}

      <EditSourceDialog
        source={source}
        jobCount={jobs?.length ?? 0}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <JobEditorDialog
        externalSourceId={externalSourceId}
        job={null}
        open={isCreateJobOpen}
        onOpenChange={setIsCreateJobOpen}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa nguồn dữ liệu này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa nguồn{' '}
            <span className="font-semibold">&ldquo;{source.name}&rdquo;</span>?
          </>
        }
        description="Cần xóa các job và kênh dữ liệu của nguồn này trước."
        confirmLabel="Xóa nguồn"
        destructive
        isPending={deleteSourceMutation.isPending}
        onConfirm={confirmDeleteSource}
      />
    </div>
  )
}
