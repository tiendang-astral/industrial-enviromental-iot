import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DatabaseZap, Plus, Unplug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { EditSourceDialog } from '@/components/datasources/EditSourceDialog'
import { JobEditorDialog } from '@/components/datasources/JobEditorDialog'
import { JobsTable } from '@/components/datasources/JobsTable'
import { SourceMetaBar } from '@/components/datasources/SourceMetaBar'
import { SourceOverview } from '@/components/datasources/SourceOverview'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useDeleteExternalSourceMutation } from '@/queries/useDeleteExternalSourceMutation'
import { useExternalSourceJobsQuery } from '@/queries/useExternalSourceJobsQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

const TABS = ['config', 'overview'] as const
type TabValue = (typeof TABS)[number]

// Slug cũ (3 tab) vẫn còn trong bookmark và lịch sử trình duyệt — chuyển hướng thay vì 404.
const LEGACY_TABS: Record<string, TabValue> = {
  connection: 'config',
  data: 'config',
  dashboard: 'overview',
}

export default function DataSourceDetailPage() {
  const { sourceId, tab } = useParams()
  const externalSourceId = Number(sourceId)
  const navigate = useNavigate()
  const activeTab: TabValue = TABS.includes(tab as TabValue) ? (tab as TabValue) : 'config'
  const legacyTarget = tab && !TABS.includes(tab as TabValue) ? LEGACY_TABS[tab] : undefined

  const { data: sources, isLoading: sourcesLoading } = useExternalSourcesQuery()
  const source = sources?.find((item) => item.id === externalSourceId)
  const { data: nodes } = useTenantNodesQuery()
  const { data: jobs, isLoading: jobsLoading } = useExternalSourceJobsQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)

  const deleteSourceMutation = useDeleteExternalSourceMutation()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  if (legacyTarget) {
    return <Navigate to={`/data-sources/${externalSourceId}/${legacyTarget}`} replace />
  }

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
      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(`/data-sources/${externalSourceId}/${value}`)}
        className="gap-6"
      >
        {/* Tab strip đặt vào slot actions của PageHeader — hàng đó vốn justify-between nên tiêu
            đề và tab tự dạt về hai đầu, không cần dựng thêm một hàng riêng. */}
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
          actions={
            <TabsList>
              <TabsTrigger value="config">Cấu hình</TabsTrigger>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            </TabsList>
          }
        />

        <TabsContent value="config" className="flex flex-col gap-6">
          <SourceMetaBar
            source={source}
            nodeName={nodeName}
            onEdit={() => setIsEditOpen(true)}
            onDelete={() => setIsDeleteOpen(true)}
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium">Job đồng bộ</h2>
              <Button onClick={() => setIsCreateJobOpen(true)}>
                <Plus data-icon="inline-start" />
                Thêm job
              </Button>
            </div>

            <JobsTable
              externalSourceId={externalSourceId}
              jobs={jobs ?? []}
              datastreams={datastreams ?? []}
              isLoading={jobsLoading}
              empty={
                <EmptyState
                  icon={DatabaseZap}
                  title="Chưa có job nào"
                />
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <SourceOverview source={source} jobs={jobs ?? []} isLoading={jobsLoading} />
        </TabsContent>
      </Tabs>

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
