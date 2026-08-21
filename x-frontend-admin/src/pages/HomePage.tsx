import { Link } from 'react-router-dom'
import { Building2, Lock, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { usePlatformUsersQuery } from '@/queries/usePlatformUsersQuery'
import { useTenantsQuery } from '@/queries/useTenantsQuery'
import type { Tenant } from '@/types/tenant'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN')
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
  isLoading,
}: {
  icon: typeof Building2
  label: string
  value: number
  hint: string
  to: string
  isLoading: boolean
}) {
  return (
    <Link to={to} className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="h-full transition-colors duration-[var(--motion-fast)] hover:border-primary/40">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Icon className="size-4" />
            {label}
          </CardDescription>
          <CardTitle className="text-3xl tabular">
            {isLoading ? <Skeleton className="h-8 w-12" /> : value}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * Backend chưa có endpoint thống kê (API.md), nên đếm client-side từ 2 list đã có sẵn —
 * quy mô vài chục tenant thì rẻ hơn nhiều so với thêm endpoint mới.
 */
export default function HomePage() {
  const { data: tenants, isLoading: tenantsLoading } = useTenantsQuery()
  const { data: platformUsers, isLoading: usersLoading } = usePlatformUsersQuery()

  const activeTenants = tenants?.filter((t) => t.status === 'ACTIVE').length ?? 0
  const lockedTenants = tenants?.filter((t) => t.status === 'LOCKED').length ?? 0
  const activeAdmins = platformUsers?.filter((u) => u.status === 'ACTIVE').length ?? 0

  const recentTenants = [...(tenants ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const columns: DataTableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Tên tenant',
      cell: (row) => (
        <Link to={`/tenants/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
    },
    { key: 'status', header: 'Trạng thái', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      cell: (row) => (
        <span className="tabular text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Tình trạng nền tảng và các tenant mới tham gia gần đây."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Tenant đang hoạt động"
          value={activeTenants}
          hint="Đăng nhập và thu thập dữ liệu bình thường"
          to="/tenants"
          isLoading={tenantsLoading}
        />
        <StatCard
          icon={Lock}
          label="Tenant đang khóa"
          value={lockedTenants}
          hint="Người dùng không đăng nhập được"
          to="/tenants"
          isLoading={tenantsLoading}
        />
        <StatCard
          icon={ShieldCheck}
          label="Quản trị viên nền tảng"
          value={activeAdmins}
          hint="Tài khoản System Admin đang mở"
          to="/platform-users"
          isLoading={usersLoading}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Tenant mới nhất</h2>
        <DataTable
          columns={columns}
          rows={recentTenants}
          getRowId={(row) => row.id}
          isLoading={tenantsLoading}
          pageSize={0}
          empty={
            <EmptyState
              icon={Users}
              title="Chưa có tenant nào"
              description="Tạo tenant đầu tiên ở trang Tổ chức."
            />
          }
        />
      </div>
    </div>
  )
}
