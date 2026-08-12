import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/app/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import TenantsPage from '@/pages/TenantsPage'
import PlatformUsersPage from '@/pages/PlatformUsersPage'

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
          { path: '/', element: <HomePage /> },
          { path: '/tenants', element: <TenantsPage /> },
          { path: '/platform-users', element: <PlatformUsersPage /> },
        ],
      },
    ],
  },
])
