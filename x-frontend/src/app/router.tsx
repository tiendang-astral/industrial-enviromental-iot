import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/app/RequireAuth'
import AppShell from '@/components/layout/AppShell'
import DashboardOverviewRedirect from '@/pages/DashboardOverviewRedirect'
import DashboardPage from '@/pages/DashboardPage'
import DevicesPage from '@/pages/DevicesPage'
import GatewayDetailPage from '@/pages/GatewayDetailPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import OrganizationPage from '@/pages/OrganizationPage'
import SiteDetailPage from '@/pages/SiteDetailPage'

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
            element: <HomePage />,
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
            path: '/dashboard',
            element: <DashboardOverviewRedirect />,
          },
          {
            path: '/dashboard/:nodeId',
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
])
