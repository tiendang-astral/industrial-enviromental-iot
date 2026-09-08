import { getMetricThreshold } from '@/lib/metricStatus'
import type { GatewayPin, PinType } from '@/types/gatewayPin'
import type { Metric } from '@/types/metric'
import type { PinTelemetry } from '@/types/telemetry'

/**
 * Một chân đã khai báo, kèm số đo mới nhất nếu có.
 *
 * `pin` là nguồn sự thật về khai báo (`GET /gateways/{id}/pins`) — nó có `enabled` và có cả chân
 * OUTPUT. `telemetry` (`GET /gateways/{id}/telemetry`) chỉ trả chân INPUT và KHÔNG có `enabled`,
 * nên không tự đứng một mình được: chỉ dựa vào nó thì chân đã tắt vẫn hiện số cũ mà không báo gì.
 */
export interface PinView {
  pin: GatewayPin
  telemetry?: PinTelemetry
  metric?: Metric
}

export interface GatewayPinViews {
  inputs: PinView[]
  outputs: PinView[]
}

/** Đọc trước chân analog rồi tới chân số, khớp thứ tự người vận hành đọc trên cầu đấu thật. */
const TYPE_ORDER: Record<PinType, number> = { AI: 0, DI: 1, DO: 2, AO: 3 }

export function buildPinViews(
  pins: GatewayPin[] | undefined,
  telemetry: PinTelemetry[] | undefined,
  metrics: Metric[] | undefined
): GatewayPinViews {
  const telemetryByPinId = new Map((telemetry ?? []).map((item) => [item.pinId, item]))
  const metricById = new Map((metrics ?? []).map((item) => [item.id, item]))

  const views: PinView[] = (pins ?? [])
    .map((pin) => ({
      pin,
      telemetry: telemetryByPinId.get(pin.id),
      metric: pin.metricId != null ? metricById.get(pin.metricId) : undefined,
    }))
    .sort(
      (a, b) =>
        TYPE_ORDER[a.pin.type] - TYPE_ORDER[b.pin.type] || a.pin.pinNumber - b.pin.pinNumber
    )

  return {
    inputs: views.filter((view) => view.pin.direction === 'INPUT'),
    outputs: views.filter((view) => view.pin.direction === 'OUTPUT'),
  }
}

export interface PinSummary {
  channelCount: number
  /** Kênh đang có số đo nằm ngoài [minValue, maxValue] của metric — câu "có gì bất thường không". */
  outOfRangeCount: number
  relayCount: number
  relayOnCount: number
}

export function summarizePins(
  { inputs, outputs }: GatewayPinViews,
  gatewayOnline: boolean
): PinSummary {
  return {
    channelCount: inputs.length,
    outOfRangeCount: inputs.filter((view) => pinHealth(view, gatewayOnline) === 'critical').length,
    relayCount: outputs.length,
    relayOnCount: outputs.filter((view) => view.pin.powerReportedState === 'ON').length,
  }
}

/**
 * Tình trạng một chân, rút về ba màu: đang chạy / vượt ngưỡng / không có tín hiệu.
 *
 * Gateway mất kết nối thì XÁM THẮNG ĐỎ: số đo còn lại là số cũ, tô đỏ theo nó là khẳng định một
 * điều mình không còn biết. Chân đã tắt dùng chung màu xám nhưng giữ nhãn riêng cho trình đọc
 * màn hình — người vận hành cần phân biệt "tự mình tắt" với "mất tín hiệu".
 */
export type PinHealth = 'online' | 'critical' | 'offline' | 'disabled'

export function pinHealth({ pin, telemetry, metric }: PinView, gatewayOnline: boolean): PinHealth {
  if (!pin.enabled) return 'disabled'
  if (!gatewayOnline) return 'offline'

  if (pin.direction === 'OUTPUT') return pin.powerReportedState ? 'online' : 'offline'
  if (telemetry?.latestValue == null) return 'offline'

  const { status } = getMetricThreshold(telemetry.latestValue, metric?.minValue, metric?.maxValue)
  return status === 'critical' ? 'critical' : 'online'
}
