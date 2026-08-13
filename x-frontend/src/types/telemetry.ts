export interface ReadingPoint {
  value: number
  measuredAt: string
}

export interface PinTelemetry {
  pinId: number
  pinNumber: number
  type: 'AI' | 'DI'
  name: string
  metricCode: string | null
  unit: string | null
  latestValue: number | null
  latestMeasuredAt: string | null
  history: ReadingPoint[]
}

/**
 * Payload nhận qua STOMP /topic/realtime/{tenantId}/{tenantNodeId} — xem ARCHITECTURE.md.
 * 3 dạng: nguồn gateway (gatewayId+pinType+pinNumber, cần tra datastreamId qua map riêng),
 * nguồn external (datastreamId thẳng, không có pin — Phase 5), và trạng thái Command
 * (commandId có mặt — Phase 7, match trực tiếp bằng commandId, không cần gatewayId/pinId).
 */
export interface RealtimeReadingMessage {
  gatewayId?: number
  pinType?: 'AI' | 'DI'
  pinNumber?: number
  datastreamId?: number
  metric?: string
  value?: number
  measuredAt?: string
  commandId?: string
  status?: 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'FAILED' | 'TIMED_OUT'
  powerReportedState?: 'ON' | 'OFF' | null
  error?: string | null
}
