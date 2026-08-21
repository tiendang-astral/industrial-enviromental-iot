import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import { WS_BASE_URL } from '@/lib/constants'
import { getAccessToken } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRealtimeStore } from '@/stores/useRealtimeStore'
import type { RealtimeReadingMessage } from '@/types/telemetry'

/**
 * Subscribe STOMP topic /topic/realtime/{tenantId}/{tenantNodeId} (xem ARCHITECTURE.md
 * § Contract STOMP/WebSocket) — tenantId lấy từ session hiện tại, tenantNodeId truyền vào
 * theo site đang xem. Không dùng SockJS — connect thẳng WebSocket native.
 */
export function useRealtimeGatewaySocket(
  tenantNodeId: number | undefined,
  onMessage: (message: RealtimeReadingMessage) => void
) {
  const tenantId = useAuthStore((s) => s.user?.tenantId)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!tenantId || !tenantNodeId) {
      return
    }

    const { setStatus, markMessage } = useRealtimeStore.getState()
    setStatus('connecting')

    const client = new Client({
      brokerURL: WS_BASE_URL,
      connectHeaders: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus('connected')
        client.subscribe(`/topic/realtime/${tenantId}/${tenantNodeId}`, (message) => {
          markMessage()
          onMessageRef.current(JSON.parse(message.body) as RealtimeReadingMessage)
        })
      },
      onWebSocketClose: () => setStatus('disconnected'),
      onStompError: () => setStatus('disconnected'),
    })
    client.activate()

    return () => {
      setStatus('idle')
      void client.deactivate()
    }
  }, [tenantId, tenantNodeId])
}
