import { Badge } from '@/components/ui/badge'

/**
 * Chip trung tính cho giá trị enum thuần phân loại (loại pin, loại kết nối, loại nguồn...).
 *
 * Tách hẳn khỏi `StatusBadge`: màu semantic (`ok`/`warning`/`critical`) là để báo TÌNH TRẠNG —
 * tô màu cả những enum chỉ mang nghĩa phân loại làm người dùng đọc nhầm "AI" hay "POSTGRESQL"
 * thành một cảnh báo. Enum phân loại vì vậy luôn neutral, chỉ status mới được mang màu.
 *
 * Giữ nguyên `font-medium` mặc định của Badge — hạ xuống `font-normal` cho "kín đáo" thì chữ trong
 * chip mảnh hơn cả chữ thường quanh nó, đọc ra như bị mờ chứ không ra kín đáo.
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
