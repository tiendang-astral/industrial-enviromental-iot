import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, Database, FileBarChart, LayoutDashboard, Network, Router } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useMeQuery } from '@/queries/useMeQuery'

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  href?: string
}

// Item chưa có href = chưa triển khai (theo roadmap PLAN.md), hiện disable + badge "Sắp có".
const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', icon: LayoutDashboard, href: '/dashboard' }, // Phase 4 — Dashboard
  { label: 'Tổ chức', icon: Network, href: '/organization' }, // Phase 2 — tenant_node / Gateway
  { label: 'Thiết bị', icon: Router, href: '/devices' }, // Phase 2 — danh sách toàn bộ gateway
  { label: 'Nguồn dữ liệu', icon: Database, href: '/data-sources' }, // Phase 5 — External source
  { label: 'Cảnh báo', icon: AlertTriangle }, // Phase 6 — Alert
  { label: 'Báo cáo', icon: FileBarChart }, // Phase 8 — Report
]

export function AppSidebar() {
  const { data: me } = useMeQuery()
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-8 items-center px-2 text-sm font-semibold text-sidebar-foreground">
          {me?.tenantId ? `Tenant #${me.tenantId}` : '—'}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) =>
                item.href ? (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith(item.href)}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton disabled aria-disabled title="Sắp có">
                      <item.icon />
                      <span>{item.label}</span>
                      <Badge variant="secondary" className="ml-auto">
                        Sắp có
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
