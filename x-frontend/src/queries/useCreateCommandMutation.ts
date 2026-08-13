import { useMutation } from '@tanstack/react-query'
import { createCommand } from '@/services/commandService'
import type { CreateCommandRequest } from '@/types/command'

export function useCreateCommandMutation(gatewayId: number, pinId: number) {
  return useMutation({
    mutationFn: (payload: CreateCommandRequest) => createCommand(gatewayId, pinId, payload),
  })
}
