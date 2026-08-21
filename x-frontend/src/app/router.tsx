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
import SiteDetailPage from '@/pages/SiteDetailPage'
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
            path: '/organization/sites/:siteId',
            element: <SiteDetailPage />,
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
        ],
      },
    ],
  },
])
