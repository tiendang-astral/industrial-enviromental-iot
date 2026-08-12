import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createGatewayPin } from '@/services/gatewayPinService'
import type { CreateGatewayPinRequest } from '@/types/gatewayPin'

export function useCreateGatewayPinMutation(gatewayId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGatewayPinRequest) => createGatewayPin(gatewayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-pins', gatewayId] })
    },
  })
}
