import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateGateway } from '@/services/gatewayService'
import type { UpdateGatewayRequest } from '@/types/gateway'

export function useUpdateGatewayMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateGatewayRequest }) => updateGateway(id, payload),
    onSuccess: (gateway) => {
      queryClient.invalidateQueries({ queryKey: ['gateways', gateway.tenantNodeId] })
      queryClient.invalidateQueries({ queryKey: ['gateways', 'all'] })
    },
  })
}
