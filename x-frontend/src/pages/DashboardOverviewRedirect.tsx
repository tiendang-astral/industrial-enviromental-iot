import { Navigate } from 'react-router-dom'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

/**
 * "Dashboard" trong Sidebar không gắn sẵn 1 node cụ thể — resolve về TENANT_ROOT. Mọi node đều có
 * board riêng, đổi node bằng ô chọn đơn vị ngay trên trang (xem DATABASE.md § dashboard).
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
