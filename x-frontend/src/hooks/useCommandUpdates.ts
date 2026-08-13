import { useCallback, useState } from 'react'
import type { CommandUpdate } from '@/types/command'
import type { RealtimeReadingMessage } from '@/types/telemetry'

/**
 * Gom message realtime dạng Command (commandId có mặt) thành map commandId -> update mới
 * nhất — dùng chung cho GatewayDetailPage và DashboardPage, cả 2 chỉ mở 1 STOMP subscription
 * duy nhất rồi route message vào đây (xem ARCHITECTURE.md § Contract MQTT Command/ACK).
 */
export function useCommandUpdates() {
  const [commandUpdates, setCommandUpdates] = useState<Record<string, CommandUpdate>>({})

  const handleCommandMessage = useCallback((message: RealtimeReadingMessage) => {
    if (!message.commandId || !message.status) return
    const commandId = message.commandId
    setCommandUpdates((prev) => ({
      ...prev,
      [commandId]: {
        status: message.status!,
        powerReportedState: message.powerReportedState ?? null,
        error: message.error ?? null,
      },
    }))
  }, [])

  return { commandUpdates, handleCommandMessage }
}
