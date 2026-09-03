import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteGatewayPin } from '@/services/gatewayPinService'

export function useDeleteGatewayPinMutation(gatewayId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pinId: number) => deleteGatewayPin(gatewayId, pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-pins', gatewayId] })
      // Pin bị xoá kéo theo datastream 1-1 của nó, nên danh sách datastream/telemetry cũng lệch.
      queryClient.invalidateQueries({ queryKey: ['gateway-telemetry', gatewayId] })
      queryClient.invalidateQueries({ queryKey: ['datastreams'] })
    },
  })
}
