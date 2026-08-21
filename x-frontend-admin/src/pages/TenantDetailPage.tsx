import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Network, Router, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { useTenantDetailQuery } from '@/queries/useTenantDetailQuery'
import type { TenantNodeSummary } from '@/types/tenant'

const NODE_TYPE_LABEL: Record<TenantNodeSummary['nodeType'], string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}

/** DFS order theo cây (children ngay sau cha) — ổn định hơn sort theo path text. */
function orderNodesDepthFirst(nodes: TenantNodeSummary[]) {
  const byParent = new Map<number | null, TenantNodeSummary[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  const result: { node: TenantNodeSummary; depth: number }[] = []
  function visit(parentId: number | null, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push({ node, depth })
      visit(node.id, depth + 1)
    }
  }
  visit(null, 0)
  return result
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

type NodeRow = { node: TenantNodeSummary; depth: number }

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tenantId = Number(id)
  const { data, isLoading } = useTenantDetailQuery(tenantId)
  const orderedNodes = useMemo(() => (data ? orderNodesDepthFirst(data.nodes) : []), [data])

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

  const nodeColumns: DataTableColumn<NodeRow>[] = [
    {
      key: 'name',
      header: 'Tên',
      // Thụt lề theo depth để nhìn ra cấu trúc cây; không sort được vì sort sẽ phá thứ tự cha-con.
      cell: ({ node, depth }) => (
        <span style={{ paddingLeft: `${depth * 20}px` }} className="font-medium">
          {node.name}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      cell: ({ node }) => (
        <span className="text-muted-foreground">{NODE_TYPE_LABEL[node.nodeType]}</span>
      ),
    },
  ]

  const gatewayColumns: DataTableColumn<(typeof data.gateways)[number]>[] = [
    { key: 'name', header: 'Tên', sortValue: (row) => row.name, cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'mac',
      header: 'MAC address',
      sortValue: (row) => row.macAddress,
      cell: (row) => <span className="tabular text-muted-foreground">{row.macAddress}</span>,
    },
    {
      key: 'lastSeen',
      header: 'Lần cuối online',
      sortValue: (row) => row.lastSeenAt,
      cell: (row) => <span className="tabular text-muted-foreground">{formatDate(row.lastSeenAt)}</span>,
    },
  ]

  const userColumns: DataTableColumn<(typeof data.users)[number]>[] = [
    { key: 'username', header: 'Username', sortValue: (row) => row.username, cell: (row) => <span className="font-medium">{row.username}</span> },
    { key: 'fullName', header: 'Họ tên', sortValue: (row) => row.fullName, cell: (row) => row.fullName },
    {
      key: 'email',
      header: 'Email',
      sortValue: (row) => row.email,
      cell: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.tenant.name}
        description={data.tenant.email}
        backTo="/tenants"
        backLabel="Danh sách tenant"
        actions={<StatusBadge status={data.tenant.status} />}
      />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Tổ chức ({orderedNodes.length})</TabsTrigger>
          <TabsTrigger value="gateways">Thiết bị ({data.gateways.length})</TabsTrigger>
          <TabsTrigger value="users">Người dùng ({data.users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <DataTable
            columns={nodeColumns}
            rows={orderedNodes}
            getRowId={({ node }) => node.id}
            pageSize={0}
            empty={
              <EmptyState
                icon={Network}
                title="Chưa có node tổ chức nào"
                description="Tenant Admin sẽ tạo cây tổ chức từ ứng dụng của họ."
              />
            }
          />
        </TabsContent>

        <TabsContent value="gateways">
          <DataTable
            columns={gatewayColumns}
            rows={data.gateways}
            getRowId={(row) => row.id}
            searchable={{
              placeholder: 'Tìm theo tên hoặc MAC',
              getText: (row) => `${row.name} ${row.macAddress}`,
            }}
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
            searchable={{
              placeholder: 'Tìm theo username hoặc họ tên',
              getText: (row) => `${row.username} ${row.fullName} ${row.email ?? ''}`,
            }}
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
