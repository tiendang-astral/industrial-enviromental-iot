import { Navigate } from 'react-router-dom'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useDashboardStore } from '@/stores/useDashboardStore'

/**
 * "Tổng quan" trong Sidebar không gắn sẵn 1 node cụ thể. Ưu tiên đưa về **nơi xem lần trước** (đơn
 * vị + tab + nguồn), chỉ rơi về TENANT_ROOT khi chưa từng xem hoặc đơn vị đó không còn trong phạm
 * vi người dùng — quay lại trang mà mất chỗ đang xem là phải chọn lại từ đầu mỗi lần.
 */
export default function DashboardOverviewRedirect() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const lastView = useDashboardStore((state) => state.lastView)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }

  const remembered = lastView && nodes?.some((node) => node.id === lastView.nodeId) ? lastView : null
  if (remembered) {
    const search = remembered.sourceId != null ? `?source=${remembered.sourceId}` : ''
    return <Navigate to={`/dashboard/${remembered.nodeId}${search}`} replace />
  }

  const root = nodes?.find((node) => node.nodeType === 'TENANT_ROOT')
  if (!root) {
    return <p className="text-sm text-muted-foreground">Không tìm thấy tổ chức</p>
  }
  return <Navigate to={`/dashboard/${root.id}`} replace />
}
