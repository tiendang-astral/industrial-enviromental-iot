import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Unplug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { EditSourceDialog } from '@/components/datasources/EditSourceDialog'
import { JobEditorDialog } from '@/components/datasources/JobEditorDialog'
import { SourceMetaBar } from '@/components/datasources/SourceMetaBar'
import { SourcePipeline } from '@/components/datasources/SourcePipeline'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDeleteExternalSourceMutation } from '@/queries/useDeleteExternalSourceMutation'
import { useExternalSourceJobsQuery } from '@/queries/useExternalSourceJobsQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

export default function DataSourceDetailPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)
  const navigate = useNavigate()

  const { data: sources, isLoading: sourcesLoading } = useExternalSourcesQuery()
  const source = sources?.find((item) => item.id === externalSourceId)
  const { data: nodes } = useTenantNodesQuery()
  const { data: jobs, isLoading: jobsLoading } = useExternalSourceJobsQuery(externalSourceId)

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
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — nguồn còn truy vấn gắn vào'))
      },
    })
  }

  if (sourcesLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
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
        backTo="/data-sources"
        title={
          <>
            Nguồn {source.name}
            <Badge variant="secondary" className="font-mono text-[11px] font-normal">
              {source.connectionType}
            </Badge>
          </>
        }
      />

      <SourceMetaBar
        source={source}
        nodeName={nodeName}
        onEdit={() => setIsEditOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
      />

      <SourcePipeline
        externalSourceId={externalSourceId}
        jobs={jobs ?? []}
        isLoading={jobsLoading}
        onAddJob={() => setIsCreateJobOpen(true)}
      />

      <EditSourceDialog
        source={source}
        jobCount={jobs?.length ?? 0}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <JobEditorDialog
        externalSourceId={externalSourceId}
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
        description="Cần xóa các truy vấn và kênh dữ liệu của nguồn này trước."
        confirmLabel="Xóa nguồn"
        destructive
        isPending={deleteSourceMutation.isPending}
        onConfirm={confirmDeleteSource}
      />
    </div>
  )
}
