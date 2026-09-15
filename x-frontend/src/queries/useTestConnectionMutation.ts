import { useMutation } from '@tanstack/react-query'
import { testConnection } from '@/services/externalSourceService'
import type {
  ConnectionType,
  ExternalSourceConnectionConfig,
  ExternalSourceCredential,
} from '@/types/externalSource'

export function useTestConnectionMutation() {
  return useMutation({
    mutationFn: (payload: {
      connectionType: ConnectionType
      connectionConfig: ExternalSourceConnectionConfig
      credential: ExternalSourceCredential
    }) => testConnection(payload.connectionType, payload.connectionConfig, payload.credential),
  })
}
