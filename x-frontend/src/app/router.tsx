import { Navigate, createBrowserRouter, useParams } from 'react-router-dom'
import { RequireAuth } from '@/app/RequireAuth'
import AppShell from '@/components/layout/AppShell'
import AlertsPage from '@/pages/AlertsPage'
import DashboardOverviewRedirect from '@/pages/DashboardOverviewRedirect'
import DashboardPage from '@/pages/DashboardPage'
import DataSourceDetailPage from '@/pages/DataSourceDetailPage'
import DataSourcesPage from '@/pages/DataSourcesPage'
import DevicesPage from '@/pages/DevicesPage'
import GatewayDetailPage from '@/pages/GatewayDetailPage'
import LoginPage from '@/pages/LoginPage'
import OrganizationPage from '@/pages/OrganizationPage'
import ReportsPage from '@/pages/ReportsPage'
import UsersPage from '@/pages/UsersPage'
import SourceDashboardPage from '@/pages/SourceDashboardPage'

/** Mọi đường dẫn con cũ của một nguồn đều về đúng nguồn đó. */
function RedirectToSource() {
  const { sourceId } = useParams()
  return <Navigate to={`/data-sources/${sourceId}`} replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: '/organization',
            element: <OrganizationPage />,
          },
          {
            path: '/devices',
            element: <DevicesPage />,
          },
          {
            path: '/devices/:gatewayId',
            element: <GatewayDetailPage />,
          },
          {
            path: '/data-sources',
            element: <DataSourcesPage />,
          },
          {
            path: '/data-sources/:sourceId',
            element: <DataSourceDetailPage />,
          },
          {
            // Trang nguồn giờ là một view duy nhất: tab cũ (/config, /overview) và trang chi tiết
            // job cũ (/jobs/:jobId/*) đều gộp vào đây, chi tiết mở bằng modal. Bookmark cũ vẫn
            // phải tới được đúng nguồn thay vì rơi vào 404.
            path: '/data-sources/:sourceId/*',
            element: <RedirectToSource />,
          },
          {
            path: '/dashboard',
            element: <DashboardOverviewRedirect />,
          },
          {
            path: '/dashboard/:nodeId',
            element: <DashboardPage />,
          },
          {
            path: '/dashboard/source/:sourceId',
            element: <SourceDashboardPage />,
          },
          {
            path: '/alerts',
            element: <AlertsPage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          {
            path: '/users',
            element: <UsersPage />,
          },
        ],
      },
    ],
  },
])
