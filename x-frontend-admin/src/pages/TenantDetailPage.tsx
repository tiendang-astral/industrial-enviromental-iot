import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Building,
  Building2,
  ChevronDown,
  ChevronRight,
  MapPinHouse,
  Network,
  Router,
  Users,
  Warehouse,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { cn } from '@/lib/utils'
import { useTenantDetailQuery } from '@/queries/useTenantDetailQuery'
import type { TenantNodeSummary } from '@/types/tenant'

const NODE_TYPE_LABEL: Record<TenantNodeSummary['nodeType'], string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}

const NODE_TYPE_ICON: Record<TenantNodeSummary['nodeType'], typeof Building2> = {
  TENANT_ROOT: Building2,
  BRANCH: Building,
  PRODUCTION_AREA: Warehouse,
  SITE: MapPinHouse,
}

interface OrgTreeEntry {
  node: TenantNodeSummary
  children: OrgTreeEntry[]
}

/** Dựng cây thật (children lồng nhau) thay vì danh sách phẳng — cần cho việc vẽ nhánh + accordion. */
function buildOrgTree(nodes: TenantNodeSummary[]): OrgTreeEntry[] {
  const byId = new Map<number, OrgTreeEntry>()
  nodes.forEach((node) => byId.set(node.id, { node, children: [] }))

  const roots: OrgTreeEntry[] = []
  nodes.forEach((node) => {
    const entry = byId.get(node.id)!
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined
    if (parent) {
      parent.children.push(entry)
    } else {
      roots.push(entry)
    }
  })

  function sortRecursive(list: OrgTreeEntry[]) {
    list.sort((a, b) => a.node.name.localeCompare(b.node.name))
    list.forEach((entry) => sortRecursive(entry.children))
  }
  sortRecursive(roots)
  return roots
}

interface OrgFlatRow {
  node: TenantNodeSummary
  depth: number
  hasChildren: boolean
  childCount: number
}

/** Làm phẳng cây theo DFS, bỏ qua nhánh đang thu gọn — chỉ giữ những hàng thật sự cần vẽ. */
function flattenVisibleRows(
  entries: OrgTreeEntry[],
  collapsedIds: Set<number>,
  depth = 0
): OrgFlatRow[] {
  const rows: OrgFlatRow[] = []
  for (const entry of entries) {
    const hasChildren = entry.children.length > 0
    rows.push({ node: entry.node, depth, hasChildren, childCount: entry.children.length })
    if (hasChildren && !collapsedIds.has(entry.node.id)) {
      rows.push(...flattenVisibleRows(entry.children, collapsedIds, depth + 1))
    }
  }
  return rows
}

const INDENT_STEP = 20

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tenantId = Number(id)
  const { data, isLoading } = useTenantDetailQuery(tenantId)
  const treeRoots = useMemo(() => (data ? buildOrgTree(data.nodes) : []), [data])
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())
  const visibleRows = useMemo(
    () => flattenVisibleRows(treeRoots, collapsedIds),
    [treeRoots, collapsedIds]
  )

  function toggleNode(id: number) {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
          {treeRoots.length === 0 ? (
            <EmptyState
              icon={Network}
              title="Chưa có node tổ chức nào"
              description="Tenant Admin sẽ tạo cây tổ chức từ ứng dụng của họ."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex h-9 items-center gap-2 bg-muted px-4">
                <span className="w-96 shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Tổ chức
                </span>
                <span className="ml-auto shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Loại
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {visibleRows.map(({ node, depth, hasChildren, childCount }) => {
                  const Icon = NODE_TYPE_ICON[node.nodeType]
                  const isCollapsed = collapsedIds.has(node.id)
                  return (
                    <div key={node.id} className="flex h-10 items-center gap-2 bg-card px-4">
                      <div
                        className="flex w-96 shrink-0 items-center gap-2"
                        style={{ paddingLeft: depth * INDENT_STEP }}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleNode(node.id)}
                              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:bg-muted hover:text-foreground"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                              <span className="sr-only">{isCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
                            </button>
                          ) : depth > 0 ? (
                            <span
                              className="mb-1.5 size-2.5 rounded-bl-[3px] border-b border-l border-border"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span
                          className={cn('truncate text-sm', depth === 0 ? 'font-semibold' : 'font-medium')}
                        >
                          {node.name}
                        </span>
                        {hasChildren && (
                          <span className="shrink-0 text-xs tabular text-muted-foreground">
                            ({childCount})
                          </span>
                        )}
                      </div>
                      <EnumBadge className="ml-auto shrink-0">{NODE_TYPE_LABEL[node.nodeType]}</EnumBadge>
                    </div>
                  )
                })}
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
