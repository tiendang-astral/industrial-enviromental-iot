import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createGateway } from '@/services/gatewayService'
import type { CreateGatewayRequest } from '@/types/gateway'

export function useCreateGatewayMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGatewayRequest) => createGateway(payload),
    onSuccess: (gateway) => {
      queryClient.invalidateQueries({ queryKey: ['gateways', gateway.tenantNodeId] })
      queryClient.invalidateQueries({ queryKey: ['gateways', 'all'] })
    },
  })
}
