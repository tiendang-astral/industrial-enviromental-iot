import { useQuery } from '@tanstack/react-query'
import { listTenantUsers } from '@/services/tenantUserService'

export function useTenantUsersQuery() {
  return useQuery({
    queryKey: ['tenant-users'],
    queryFn: listTenantUsers,
  })
}
