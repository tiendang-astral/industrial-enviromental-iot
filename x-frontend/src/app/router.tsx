import { Navigate, createBrowserRouter } from 'react-router-dom'
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
import JobDetailPage from '@/pages/JobDetailPage'
import SourceDashboardPage from '@/pages/SourceDashboardPage'

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
            // Tab nằm trong đường dẫn (không phải state cục bộ) để chia sẻ link và nút Back
            // trỏ đúng tab. Không có tab → về "data", nơi công việc thực sự diễn ra.
            path: '/data-sources/:sourceId',
            element: <Navigate to="config" replace />,
          },
          {
            path: '/data-sources/:sourceId/:tab',
            element: <DataSourceDetailPage />,
          },
          {
            path: '/data-sources/:sourceId/jobs/:jobId',
            element: <Navigate to="config" replace />,
          },
          {
            path: '/data-sources/:sourceId/jobs/:jobId/:tab',
            element: <JobDetailPage />,
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
