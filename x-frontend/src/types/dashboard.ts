export interface WidgetLayout {
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetBinding {
  datastreamId: number
}

/** Đợt 1 (PLAN.md Phase 4) — SWITCH/EVENT_* để phase sau. */
export type WidgetType = 'VALUE' | 'LINE' | 'DEVICE_LIST' | 'DEVICES_ONLINE'

export interface Widget {
  id: string
  type: WidgetType
  layout: WidgetLayout
  title: string
  binding: WidgetBinding | null
  config: Record<string, unknown>
}

export interface Dashboard {
  id: number
  tenantNodeId: number
  /** NOT NULL = board riêng theo 1 nguồn, layout riêng (Phase 5, xem DATABASE.md § dashboard). */
  externalSourceId: number | null
  name: string
  widgets: Widget[]
}

export interface Datastream {
  id: number
  tenantNodeId: number
  name: string
  metricId: number
  metricCode: string | null
  metricUnit: string | null
  sourceType: 'GATEWAY_PIN' | 'EXTERNAL_SOURCE_JOB'
  sourceId: number
  /** Chỉ có khi sourceType=EXTERNAL_SOURCE_JOB — field trong query_config.valueColumns. */
  sourceField: string | null
  sourceGatewayId: number | null
  sourcePinType: 'AI' | 'DI' | null
  sourcePinNumber: number | null
  /** gateway_pin.enabled hiện tại — false = "Pin đã tắt", datastream KHÔNG bị xóa (xem DATABASE.md). */
  sourceEnabled: boolean | null
  /** Chỉ có giá trị khi lấy qua listDatastreamsByExternalSource (đọc InfluxDB) — null ở nơi khác. */
  latestValue: number | null
  latestMeasuredAt: string | null
}

export interface DashboardTemplateWidget {
  widgetType: WidgetType
  metric: string
  config: Record<string, unknown>
}

export interface DashboardTemplate {
  id: number
  name: string
  description: string | null
  layoutJson: DashboardTemplateWidget[]
}

export interface DeviceSummary {
  id: number
  name: string
  macAddress: string
  lastSeenAt: string | null
  online: boolean
}

/** State realtime phía FE cho 1 datastream — DashboardPage giữ Record<datastreamId, DatastreamReading>. */
export interface DatastreamReading {
  latestValue: number | null
  latestMeasuredAt: string | null
  history: { value: number; measuredAt: string }[]
}
