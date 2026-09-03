import type { ComponentType } from 'react'
import {
  BellRing,
  Database,
  FileBarChart,
  LayoutDashboard,
  Network,
  Router,
  Users,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

export interface NavGroup {
  /** null = nhóm không có tiêu đề. */
  label: string | null
  items: NavItem[]
}

// Nguồn cấu trúc menu duy nhất — AppSidebar (render nav) và AppTopbar (breadcrumb) đọc từ đây.
// Chia theo việc người dùng đang làm: "Dữ liệu" là xem/đọc, "Quản lý" là cấu hình/thay đổi.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dữ liệu',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Báo cáo', href: '/reports', icon: FileBarChart },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { label: 'Tổ chức', href: '/organization', icon: Network },
      { label: 'Thiết bị', href: '/devices', icon: Router },
      { label: 'Nguồn dữ liệu', href: '/data-sources', icon: Database },
      { label: 'Cảnh báo', href: '/alerts', icon: BellRing },
      { label: 'Người dùng', href: '/users', icon: Users },
    ],
  },
]

/** Danh sách phẳng cho breadcrumb — giữ đúng thứ tự hiển thị trong sidebar. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.href))
}

/**
 * Cây tổ chức và bộ chọn khoảng thời gian chỉ có nghĩa ở nhóm trang Dashboard — các trang còn lại
 * là danh sách/cấu hình theo toàn bộ scope, không neo vào một đơn vị cụ thể.
 */
export function isNodeScopedRoute(pathname: string) {
  return pathname.startsWith('/dashboard')
}
