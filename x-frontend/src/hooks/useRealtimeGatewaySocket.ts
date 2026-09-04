import { useEffect, useMemo, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import { WS_BASE_URL } from '@/lib/constants'
import { getAccessToken } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRealtimeStore } from '@/stores/useRealtimeStore'
import type { RealtimeReadingMessage } from '@/types/telemetry'

/**
 * Subscribe STOMP topic /topic/realtime/{tenantId}/{tenantNodeId} (xem ARCHITECTURE.md
 * § Contract STOMP/WebSocket) — tenantId lấy từ session hiện tại.
 *
 * Nhận **nhiều** node vì board ở cấp gộp bind được kênh của nhiều site, mà mỗi site publish vào
 * một channel Redis riêng. Nhiều SUBSCRIBE frame trên cùng một WebSocket, không phải nhiều kết nối
 * — chi phí gắn với số site board đang hiện, không gắn với kích thước cây tổ chức.
 */
export function useRealtimeGatewaySocket(
  tenantNodeIds: number | number[] | undefined,
  onMessage: (message: RealtimeReadingMessage) => void
) {
  const tenantId = useAuthStore((s) => s.user?.tenantId)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  // Khoá ổn định để mảng mới cùng nội dung không làm ngắt/nối lại WebSocket mỗi lần render.
  const nodeKey = useMemo(() => {
    const ids = tenantNodeIds == null ? [] : Array.isArray(tenantNodeIds) ? tenantNodeIds : [tenantNodeIds]
    return [...new Set(ids.filter(Boolean))].sort((a, b) => a - b).join(',')
  }, [tenantNodeIds])

  useEffect(() => {
    if (!tenantId || !nodeKey) {
      return
    }
    const nodeIds = nodeKey.split(',').map(Number)

    const { setStatus, markMessage } = useRealtimeStore.getState()
    setStatus('connecting')

    const client = new Client({
      brokerURL: WS_BASE_URL,
      connectHeaders: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus('connected')
        for (const nodeId of nodeIds) {
          client.subscribe(`/topic/realtime/${tenantId}/${nodeId}`, (message) => {
            markMessage()
            onMessageRef.current(JSON.parse(message.body) as RealtimeReadingMessage)
          })
        }
      },
      onWebSocketClose: () => setStatus('disconnected'),
      onStompError: () => setStatus('disconnected'),
    })
    client.activate()

    return () => {
      setStatus('idle')
      void client.deactivate()
    }
  }, [tenantId, nodeKey])
}
