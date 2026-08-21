import type { ComponentType } from 'react'
import { Building2, LayoutDashboard, Users } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

export interface NavGroup {
  /** null = nhóm không có tiêu đề, đặt trên cùng. */
  label: string | null
  items: NavItem[]
}

// Nguồn cấu trúc menu duy nhất — sidebar và breadcrumb đều đọc từ đây.
// Chia nhóm theo đối tượng quản trị: "Khách hàng" là dữ liệu của tenant, "Hệ thống" là tài khoản
// vận hành chính nền tảng — 2 việc khác hẳn nhau về mức độ rủi ro khi thao tác nhầm.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Khách hàng',
    items: [{ label: 'Tổ chức', href: '/tenants', icon: Building2 }],
  },
  {
    label: 'Hệ thống',
    items: [{ label: 'Người dùng', href: '/platform-users', icon: Users }],
  },
]

/** Danh sách phẳng cho breadcrumb — giữ đúng thứ tự hiển thị trong sidebar. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/** Trang chi tiết không có trong nav — map riêng để breadcrumb hiện đúng nhánh cha. */
export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS[0]
  return NAV_ITEMS.filter((item) => item.href !== '/').find((item) =>
    pathname.startsWith(item.href)
  )
}
