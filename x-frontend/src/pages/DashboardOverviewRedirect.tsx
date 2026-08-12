import { Navigate } from 'react-router-dom'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

/**
 * "Tổng quan" trong Sidebar không gắn sẵn 1 node cụ thể — resolve về TENANT_ROOT
 * (dashboard.tenant_node_id có thể là bất kỳ node nào, xem DATABASE.md § dashboard),
 * mỗi Site có Dashboard riêng của nó truy cập qua SiteDetailPage.
 */
export default function DashboardOverviewRedirect() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const root = nodes?.find((n) => n.nodeType === 'TENANT_ROOT')

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }
  if (!root) {
    return <p className="text-sm text-muted-foreground">Không tìm thấy tổ chức</p>
  }
  return <Navigate to={`/dashboard/${root.id}`} replace />
}
