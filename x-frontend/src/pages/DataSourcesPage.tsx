import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { ExternalSourceFormDialog } from '@/components/datasources/ExternalSourceFormDialog'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { ExternalSource } from '@/types/externalSource'

function formatLastSync(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function DataSourcesPage() {
  const { data: sources, isLoading } = useExternalSourcesQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  function nodeName(tenantNodeId: number) {
    return nodes?.find((node) => node.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  const columns: DataTableColumn<ExternalSource>[] = [
    {
      key: 'name',
      header: 'Tên nguồn',
      sortValue: (row) => row.name,
      cell: (row) => (
        <Link
          to={`/data-sources/${row.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Database className="size-4 text-muted-foreground" />
          {row.name}
        </Link>
      ),
    },
    {
      key: 'node',
      header: 'Gắn tại',
      sortValue: (row) => nodeName(row.tenantNodeId),
      cell: (row) => <span className="text-muted-foreground">{nodeName(row.tenantNodeId)}</span>,
    },
    {
      key: 'connection',
      header: 'Kết nối',
      cell: (row) => (
        <span className="tabular text-muted-foreground">
          {row.connectionConfig.host}:{row.connectionConfig.port}/{row.connectionConfig.database}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Đồng bộ gần nhất',
      sortValue: (row) => row.lastSyncAt ?? '',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.lastSyncStatus ?? 'PENDING'} label={row.lastSyncStatus ? undefined : 'Chưa chạy'} />
          <span className="text-xs text-muted-foreground tabular">
            {formatLastSync(row.lastSyncAt)}
          </span>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nguồn dữ liệu"
        description="Các cơ sở dữ liệu ngoài được kéo dữ liệu về theo lịch."
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
        searchable={{
          placeholder: 'Tìm theo tên nguồn hoặc host',
          getText: (row) => `${row.name} ${row.connectionConfig.host} ${row.connectionConfig.database}`,
        }}
        empty={
          <EmptyState
            icon={Database}
            title="Chưa có nguồn dữ liệu nào"
            description="Kết nối một PostgreSQL ngoài để lấy dữ liệu về cùng chỗ với dữ liệu cảm biến."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                Thêm nguồn
              </Button>
            }
          />
        }
      />

      <ExternalSourceFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
