import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { CopyButton } from '@/components/patterns/CopyButton'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { EditSourceDialog } from '@/components/datasources/EditSourceDialog'
import { ExternalSourceFormDialog } from '@/components/datasources/ExternalSourceFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { useDeleteExternalSourceMutation } from '@/queries/useDeleteExternalSourceMutation'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { ExternalSource } from '@/types/externalSource'

const CONNECTION_TYPE_LABEL: Record<string, string> = {
  POSTGRESQL: 'PostgreSQL',
}

/** `null` = chưa chạy lần nào — khác hẳn "đã chạy và đang chờ", nên không gộp vào PENDING. */
function syncStatusOf(source: ExternalSource) {
  return source.lastSyncStatus ?? 'NEVER_RUN'
}

function connectionString(source: ExternalSource) {
  const { host, port, database } = source.connectionConfig
  return `${host}:${port}/${database}`
}

export default function DataSourcesPage() {
  const navigate = useNavigate()
  const { data: sources, isLoading } = useExternalSourcesQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExternalSource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExternalSource | null>(null)

  const deleteMutation = useDeleteExternalSourceMutation()

  function nodeName(tenantNodeId: number) {
    return nodes?.find((node) => node.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  // Chỉ liệt kê đơn vị đang thực sự có nguồn gắn vào — dropdown lọc mà đầy lựa chọn cho ra 0 dòng
  // thì vô dụng.
  const nodeOptions = Array.from(new Set(sources?.map((source) => source.tenantNodeId) ?? []))
    .map((id) => ({ value: String(id), label: nodeName(id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'))

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa nguồn dữ liệu thành công')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại')),
    })
  }

  const columns: DataTableColumn<ExternalSource>[] = [
    {
      key: 'name',
      header: 'Tên nguồn',
      filter: { type: 'text', placeholder: 'Tìm kiếm tên', getValue: (row) => row.name },
      cell: (row) => (
        <Link to={`/data-sources/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      headerClassName: 'w-40',
      filter: {
        type: 'select',
        placeholder: 'Tất cả loại',
        getValue: (row) => row.connectionType,
        options: Object.entries(CONNECTION_TYPE_LABEL).map(([value, label]) => ({ value, label })),
      },
      cell: (row) => (
        <EnumBadge>{CONNECTION_TYPE_LABEL[row.connectionType] ?? row.connectionType}</EnumBadge>
      ),
    },
    {
      key: 'node',
      header: 'Tổ chức',
      filter: {
        type: 'select',
        placeholder: 'Tất cả đơn vị',
        getValue: (row) => String(row.tenantNodeId),
        options: nodeOptions,
      },
      cell: (row) => nodeName(row.tenantNodeId),
    },
    {
      key: 'connection',
      header: 'Kết nối',
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <span className="tabular text-muted-foreground">{connectionString(row)}</span>
          <CopyButton
            value={connectionString(row)}
            label={`Sao chép chuỗi kết nối của ${row.name}`}
          />
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Tất cả trạng thái',
        getValue: syncStatusOf,
        options: [
          { value: 'SUCCESS', label: 'Thành công' },
          { value: 'RUNNING', label: 'Đang chạy' },
          { value: 'FAILED', label: 'Thất bại' },
          { value: 'NEVER_RUN', label: 'Chưa chạy' },
        ],
      },
      cell: (row) =>
        row.lastSyncStatus ? (
          <StatusBadge status={row.lastSyncStatus} />
        ) : (
          <StatusBadge status="PENDING" label="Chưa chạy" />
        ),
    },
    {
      key: 'lastSync',
      header: 'Đồng bộ gần nhất',
      headerClassName: 'text-right',
      className: 'text-muted-foreground tabular text-right',
      cell: (row) => formatDateTime(row.lastSyncAt),
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nguồn dữ liệu"
        description="Danh sách cơ sở dữ liệu ngoài của đơn vị."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm nguồn
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={sources}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/data-sources/${row.id}`)}
        empty={
          <EmptyState
            icon={Database}
            title="Chưa có nguồn dữ liệu nào"
            description="Kết nối một PostgreSQL ngoài để lấy dữ liệu về cùng chỗ với dữ liệu cảm biến."
          />
        }
      />

      <ExternalSourceFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {/* EditSourceDialog nhận `source` non-null nên chỉ mount khi đã có hàng được chọn — cũng là
          cách để form reset sạch mỗi lần mở, không giữ giá trị của nguồn bấm trước đó. */}
      {editTarget && (
        <EditSourceDialog
          source={editTarget}
          open
          onOpenChange={(open) => !open && setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa nguồn dữ liệu này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        description="Cần xóa các job và kênh dữ liệu của nguồn này trước."
        confirmLabel="Xóa nguồn"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
