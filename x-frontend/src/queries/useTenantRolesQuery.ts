import { useQuery } from '@tanstack/react-query'
import { listTenantRoles } from '@/services/tenantUserService'

export function useTenantRolesQuery() {
  return useQuery({
    queryKey: ['tenant-roles'],
    // Master data theo tenant, gần như không đổi — không cần refetch mỗi lần mở lại trang.
    staleTime: 5 * 60 * 1000,
    queryFn: listTenantRoles,
  })
}
