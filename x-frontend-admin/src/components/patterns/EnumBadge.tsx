import { Badge } from '@/components/ui/badge'

/**
 * Chip trung tính cho giá trị enum thuần phân loại (loại node, loại kết nối...).
 *
 * Tách hẳn khỏi `StatusBadge`: màu semantic (ok/warning/critical) là để báo TÌNH TRẠNG — tô màu
 * cả những enum chỉ mang nghĩa phân loại làm người dùng đọc nhầm thành một cảnh báo. Enum phân
 * loại vì vậy luôn neutral, chỉ status mới được mang màu.
 */
export function EnumBadge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant="secondary" className={className}>
      {children}
    </Badge>
  )
}
