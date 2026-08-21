/** Mã role backend → nhãn tiếng Việt. Cấm render thẳng `TENANT_ADMIN` ra giao diện. */
const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Quản trị viên nền tảng',
  TENANT_ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  OPERATOR: 'Kỹ thuật viên',
  VIEWER: 'Nhân viên',
}

/** Một user có thể giữ nhiều role ở nhiều scope — nối lại để hiện cạnh avatar. */
export function formatRoles(authorities: string[] | undefined): string {
  if (!authorities?.length) return 'Chưa phân quyền'
  return authorities.map((value) => ROLE_LABEL[value] ?? value).join(', ')
}
