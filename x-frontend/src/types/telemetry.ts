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
 * 2 dạng: nguồn gateway (gatewayId+pinType+pinNumber, cần tra datastreamId qua map riêng)
 * và nguồn external (datastreamId thẳng, không có pin — Phase 5).
 */
export interface RealtimeReadingMessage {
  gatewayId?: number
  pinType?: 'AI' | 'DI'
  pinNumber?: number
  datastreamId?: number
  metric: string
  value: number
  measuredAt: string
}
