import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteGateway } from '@/services/gatewayService'

export function useDeleteGatewayMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteGateway(id),
    onSuccess: () => {
      // Không biết gateway thuộc site nào sau khi xóa — invalidate mọi query 'gateways' (theo site lẫn 'all').
      queryClient.invalidateQueries({ queryKey: ['gateways'] })
    },
  })
}
