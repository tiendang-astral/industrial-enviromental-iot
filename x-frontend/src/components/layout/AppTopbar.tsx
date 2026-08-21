import { Fragment } from 'react'
import { Link } from 'react-router-dom'
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

export interface Crumb {
  label: string
  href?: string
}

/** Dải khung ngang duy nhất: trái là thu gọn sidebar + đang xem ở đâu, phải là giao diện + tài khoản. */
export function AppTopbar({ trail }: { trail: Crumb[] }) {
  return (
    <header className="bg-app-chrome sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-surface-deep-border px-4">
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
                  <BreadcrumbPage className="text-surface-deep-foreground">
                    {crumb.label}
                  </BreadcrumbPage>
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
