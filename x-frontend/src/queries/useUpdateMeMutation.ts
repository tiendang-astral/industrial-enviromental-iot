import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMe } from '@/services/authService'
import type { MeResponse, UpdateMeRequest } from '@/types/auth'

export function useUpdateMeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateMeRequest) => updateMe(payload),
    // Backend trả về MeResponse mới nên ghi thẳng vào cache, không cần refetch thêm 1 vòng.
    onSuccess: (me: MeResponse) => queryClient.setQueryData(['me'], me),
  })
}
