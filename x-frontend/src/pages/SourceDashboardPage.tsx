import { Navigate, useParams } from 'react-router-dom'
import { useSourceDashboardQuery } from '@/queries/useSourceDashboardQuery'

/**
 * Board theo nguồn nay nằm trong tab "Xem theo nguồn" của trang Dashboard, chọn bằng dropdown.
 * Route này giữ lại để link/bookmark cũ (`/dashboard/source/:id`) không chết — chuyển hướng về
 * đúng đơn vị của nguồn kèm tham số chọn sẵn nguồn đó.
 */
export default function SourceDashboardPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)
  const { data: dashboard, isLoading } = useSourceDashboardQuery(externalSourceId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }
  if (!dashboard?.tenantNodeId) {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to={`/dashboard/${dashboard.tenantNodeId}?source=${externalSourceId}`} replace />
}
