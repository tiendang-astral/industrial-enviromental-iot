import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserMenu } from '@/components/layout/UserMenu'
import { findNavItem } from '@/components/layout/navConfig'

function useBreadcrumbTrail() {
  const { pathname } = useLocation()
  const item = findNavItem(pathname)

  if (!item) return [{ label: 'Quản trị nền tảng' }]
  if (pathname === item.href) return [{ label: item.label }]
  // Trang chi tiết /tenants/:id — shell không biết tên tenant, trang con tự hiện ở PageHeader.
  return [{ label: item.label, href: item.href }, { label: 'Chi tiết' }]
}

export function AppTopbar() {
  const trail = useBreadcrumbTrail()

  return (
    <header className="bg-app-chrome sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-surface-deep-border px-6">
      <SidebarTrigger className="-ms-2 text-surface-deep-muted hover:bg-surface-deep-hover hover:text-surface-deep-foreground" />
      <Separator orientation="vertical" className="h-4 bg-surface-deep-border" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="text-surface-deep-muted">
          {trail.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink
                    asChild
                    className="text-surface-deep-muted hover:text-surface-deep-foreground"
                  >
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-surface-deep-foreground">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <ThemeToggle />
      <UserMenu />
    </header>
  )
}
