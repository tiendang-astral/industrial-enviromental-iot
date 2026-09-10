import { useParams } from 'react-router-dom'
import { Network, Router, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { OrgTree } from '@/components/tenant/OrgTree'
import { useTenantDetailQuery } from '@/queries/useTenantDetailQuery'

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tenantId = Number(id)
  const { data, isLoading } = useTenantDetailQuery(tenantId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }
  if (!data) {
    return (
      <EmptyState
        icon={Network}
        title="Không tìm thấy tenant"
        description="Tenant có thể đã bị xóa hoặc bạn truy cập nhầm đường dẫn."
      />
    )
  }

  const gatewayColumns: DataTableColumn<(typeof data.gateways)[number]>[] = [
    {
      key: 'name',
      header: 'Tên',
      filter: { type: 'text', placeholder: 'Tìm tên', getValue: (row) => row.name },
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'mac',
      header: 'MAC address',
      filter: { type: 'text', placeholder: 'Tìm MAC', getValue: (row) => row.macAddress },
      cell: (row) => <span className="tabular text-muted-foreground">{row.macAddress}</span>,
    },
    {
      key: 'lastSeen',
      header: 'Lần cuối online',
      cell: (row) => <span className="tabular text-muted-foreground">{formatDate(row.lastSeenAt)}</span>,
    },
  ]

  const userColumns: DataTableColumn<(typeof data.users)[number]>[] = [
    {
      key: 'username',
      header: 'Username',
      filter: { type: 'text', placeholder: 'Tìm username', getValue: (row) => row.username },
      cell: (row) => <span className="font-medium">{row.username}</span>,
    },
    {
      key: 'fullName',
      header: 'Họ tên',
      filter: { type: 'text', placeholder: 'Tìm họ tên', getValue: (row) => row.fullName },
      cell: (row) => row.fullName,
    },
    {
      key: 'email',
      header: 'Email',
      filter: { type: 'text', placeholder: 'Tìm email', getValue: (row) => row.email ?? '' },
      cell: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Trạng thái',
        getValue: (row) => row.status,
        options: [
          { value: 'ACTIVE', label: 'Đang hoạt động' },
          { value: 'LOCKED', label: 'Đã khóa' },
        ],
      },
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {data.tenant.name}
            <StatusBadge status={data.tenant.status} className="rounded-md" />
          </span>
        }
        description={data.tenant.email}
        backTo="/tenants"
        backLabel="Danh sách tenant"
      />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Tổ chức ({data.nodes.length})</TabsTrigger>
          <TabsTrigger value="gateways">Thiết bị ({data.gateways.length})</TabsTrigger>
          <TabsTrigger value="users">Người dùng ({data.users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          {data.nodes.length === 0 ? (
            <EmptyState
              icon={Network}
              title="Chưa có node tổ chức nào"
              description="Tenant Admin sẽ tạo cây tổ chức từ ứng dụng của họ."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
              <div className="flex h-9 items-center justify-between border-b border-border bg-table-header px-4">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Cây tổ chức
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {data.nodes.length} đơn vị
                </span>
              </div>
              <div className="p-3">
                <OrgTree nodes={data.nodes} gateways={data.gateways} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gateways">
          <DataTable
            columns={gatewayColumns}
            rows={data.gateways}
            getRowId={(row) => row.id}
            showIndex
            empty={
              <EmptyState
                icon={Router}
                title="Chưa có thiết bị nào"
                description="Tenant chưa đăng ký gateway nào vào hệ thống."
              />
            }
          />
        </TabsContent>

        <TabsContent value="users">
          <DataTable
            columns={userColumns}
            rows={data.users}
            getRowId={(row) => row.id}
            showIndex
            empty={
              <EmptyState
                icon={Users}
                title="Chưa có người dùng nào"
                description="Tenant này chưa có tài khoản nào ngoài Tenant Admin ban đầu."
              />
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
