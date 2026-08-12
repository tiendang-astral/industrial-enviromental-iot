import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateGatewayPin } from '@/services/gatewayPinService'
import type { UpdateGatewayPinRequest } from '@/types/gatewayPin'

export function useUpdateGatewayPinMutation(gatewayId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pinId, payload }: { pinId: number; payload: UpdateGatewayPinRequest }) =>
      updateGatewayPin(gatewayId, pinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-pins', gatewayId] })
    },
  })
}
