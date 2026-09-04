import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Database, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/patterns/CopyButton'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { ExternalSourceFormDialog } from '@/components/datasources/ExternalSourceFormDialog'
import { formatDateTime } from '@/lib/datetime'
import { connectionString } from '@/lib/externalSource'
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

export default function DataSourcesPage() {
  const navigate = useNavigate()
  const { data: sources, isLoading } = useExternalSourcesQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  function nodeName(tenantNodeId: number) {
    return nodes?.find((node) => node.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  // Chỉ liệt kê đơn vị đang thực sự có nguồn gắn vào — dropdown lọc mà đầy lựa chọn cho ra 0 dòng
  // thì vô dụng.
  const nodeOptions = Array.from(new Set(sources?.map((source) => source.tenantNodeId) ?? []))
    .map((id) => ({ value: String(id), label: nodeName(id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'))

  const columns: DataTableColumn<ExternalSource>[] = [
    {
      key: 'name',
      header: 'Tên nguồn',
      filter: { type: 'text', placeholder: 'Tìm kiếm tên', getValue: (row) => row.name },
      cell: (row) => (
        <Link to={`/data-sources/${row.id}/config`} className="font-medium hover:underline">
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
        placeholder: 'Loại',
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
        placeholder: 'Đơn vị',
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
        placeholder: 'Trạng thái',
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
        onRowClick={(row) => navigate(`/data-sources/${row.id}/config`)}
        empty={
          <EmptyState
            icon={Database}
            title="Chưa có nguồn dữ liệu nào"
            description="Kết nối một PostgreSQL ngoài để lấy dữ liệu về cùng chỗ với dữ liệu cảm biến."
          />
        }
      />

      <ExternalSourceFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
