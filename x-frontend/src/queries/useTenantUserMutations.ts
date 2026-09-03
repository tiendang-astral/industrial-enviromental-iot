import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createTenantUser,
  deleteTenantUser,
  resetTenantUserPassword,
  updateTenantUser,
  updateTenantUserStatus,
} from '@/services/tenantUserService'
import type {
  CreateTenantUserRequest,
  ResetTenantUserPasswordRequest,
  UpdateTenantUserRequest,
  UpdateTenantUserStatusRequest,
} from '@/types/tenantUser'

/** Mọi mutation của người dùng đều đụng cùng một danh sách, nên dùng chung một hàm invalidate. */
function useInvalidateTenantUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
}

export function useCreateTenantUserMutation() {
  const invalidate = useInvalidateTenantUsers()
  return useMutation({
    mutationFn: (payload: CreateTenantUserRequest) => createTenantUser(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTenantUserMutation() {
  const invalidate = useInvalidateTenantUsers()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenantUserRequest }) =>
      updateTenantUser(id, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTenantUserStatusMutation() {
  const invalidate = useInvalidateTenantUsers()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenantUserStatusRequest }) =>
      updateTenantUserStatus(id, payload),
    onSuccess: invalidate,
  })
}

export function useResetTenantUserPasswordMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResetTenantUserPasswordRequest }) =>
      resetTenantUserPassword(id, payload),
  })
}

export function useDeleteTenantUserMutation() {
  const invalidate = useInvalidateTenantUsers()
  return useMutation({
    mutationFn: (id: number) => deleteTenantUser(id),
    onSuccess: invalidate,
  })
}
