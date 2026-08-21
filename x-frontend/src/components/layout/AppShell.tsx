import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar, type Crumb } from '@/components/layout/AppTopbar'
import { OrgTreePanel } from '@/components/layout/OrgTreePanel'
import { findNavItem, isNodeScopedRoute } from '@/components/layout/navConfig'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useUiStore } from '@/stores/useUiStore'

/**
 * Nguồn label breadcrumb là NAV_ITEMS (navConfig) — 1 nguồn duy nhất, tránh lệch label giữa nav
 * và breadcrumb. Riêng /dashboard/:nodeId lấy thêm tên đơn vị từ cache tenant-nodes (panel cây
 * tổ chức đã fetch sẵn) vì "Chi tiết" không cho biết đang xem đơn vị nào.
 */
function useBreadcrumbTrail(): Crumb[] {
  const { pathname } = useLocation()
  const dashboardMatch = useMatch('/dashboard/:nodeId')
  const { data: nodes } = useTenantNodesQuery()

  const item = findNavItem(pathname)
  if (!item) return [{ label: 'Trang chủ' }]

  if (dashboardMatch) {
    const node = nodes?.find((n) => n.id === Number(dashboardMatch.params.nodeId))
    return node
      ? [{ label: item.label, href: item.href }, { label: node.name }]
      : [{ label: item.label }]
  }

  if (pathname === item.href) return [{ label: item.label }]
  return [{ label: item.label, href: item.href }, { label: 'Chi tiết' }]
}

export default function AppShell() {
  const { pathname } = useLocation()
  const trail = useBreadcrumbTrail()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        <SidebarInset className="bg-app flex min-h-svh min-w-0 flex-col">
          <AppTopbar trail={trail} />
          <div className="flex min-h-0 flex-1">
            {isNodeScopedRoute(pathname) && <OrgTreePanel />}
            <main className="min-w-0 flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
