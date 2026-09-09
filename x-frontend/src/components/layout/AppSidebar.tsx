import { NavLink, useLocation } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { NAV_GROUPS } from '@/components/layout/navConfig'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

/**
 * Nav chức năng. Thu gọn kiểu icon-rail — mỗi mục có icon riêng nên rail vẫn nhận ra được.
 * Chữ để ở 15px/medium và độ mờ 85% thay vì 14px/70%: đây là đích bấm chính của cả app,
 * mờ hơn nữa thì đọc lướt không ra mục nào đang mở.
 */
export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-0">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2.5 text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
        >
          <Activity className="size-5 shrink-0 text-sidebar-primary" />
          <span className="text-[0.9375rem] font-semibold tracking-wide group-data-[collapsible=icon]:hidden">
            Astralx IoT
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {NAV_GROUPS.map((group, index) => (
          <SidebarGroup
            key={group.label ?? `group-${index}`}
            className="px-2 py-1 group-data-[collapsible=icon]:px-1"
          >
            {group.label && (
              <SidebarGroupLabel className="h-6 px-3 text-[0.6875rem] font-semibold tracking-wider text-sidebar-foreground/45 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          'relative h-10 gap-3 rounded-lg px-3 text-[0.9375rem] font-medium',
                          // Base của shadcn ép size-8!/p-2! khi thu gọn — nút tụt từ 40px xuống 32px
                          // và icon lệch khỏi tâm rail. Giữ đúng 40×40 (rail 48px - px-1 hai bên).
                          'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!',
                          'text-sidebar-foreground/85 transition-colors duration-[var(--motion-fast)]',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          'data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground',
                          '[&_svg]:size-[1.125rem]'
                        )}
                      >
                        <NavLink to={item.href}>
                          {/* Vạch màu bên trái: dấu hiệu "đang ở đây" đọc được kể cả khi liếc nhanh,
                              mạnh hơn hẳn việc chỉ đổi nền một chút. */}
                          <span
                            aria-hidden
                            className={cn(
                              'absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-sidebar-primary transition-opacity duration-[var(--motion-fast)]',
                              isActive ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <item.icon className={cn(isActive && 'text-sidebar-primary')} />
                          {/* Thu gọn thì ẩn hẳn nhãn: base shadcn chỉ trông vào overflow-hidden của
                              nút 32px để cắt chữ, giữ nút 40px thì chữ thò ra và đẩy icon lệch tâm. */}
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
