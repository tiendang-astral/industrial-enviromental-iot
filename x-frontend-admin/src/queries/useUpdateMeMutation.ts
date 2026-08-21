import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { MeResponse, UpdateMeRequest } from '@/types/auth'

export function useUpdateMeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateMeRequest) => {
      const { data } = await httpClient.put<ApiResponse<MeResponse>>('/me', payload)
      return data.data!
    },
    // Backend trả về MeResponse mới nên ghi thẳng vào cache, không cần refetch thêm 1 vòng.
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  })
}
