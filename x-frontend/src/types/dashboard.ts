export interface WidgetLayout {
  x: number
  y: number
  w: number
  h: number
}

/**
 * VALUE/LINE dùng kênh dữ liệu; SWITCH (Phase 7) dùng gatewayId+pinId — pin OUTPUT không có datastream.
 * `datastreamId` là dạng CŨ (một kênh), `datastreamIds` là dạng mới (nhiều kênh) — luôn đọc qua
 * `widgetDatastreamIds()` thay vì chạm thẳng vào hai field này.
 */
export interface WidgetBinding {
  datastreamId?: number
  datastreamIds?: number[]
  gatewayId?: number
  pinId?: number
}

/** VALUE/LINE/DEVICE_LIST/DEVICES_ONLINE (Phase 4) + SWITCH (Phase 7) — EVENT_* để phase sau. */
export type WidgetType = 'VALUE' | 'LINE' | 'DEVICE_LIST' | 'DEVICES_ONLINE' | 'SWITCH'

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
  /** Chỉ có khi sourceType=EXTERNAL_SOURCE_JOB — tên cột trong kết quả truy vấn của job. */
  sourceField: string | null
  sourceGatewayId: number | null
  sourcePinType: 'AI' | 'DI' | null
  sourcePinNumber: number | null
  /** gateway_pin.enabled hiện tại — false = "Pin đã tắt", datastream KHÔNG bị xóa (xem DATABASE.md). */
  sourceEnabled: boolean | null
  /** Chỉ có giá trị khi lấy qua listDatastreamsByExternalSource (đọc InfluxDB) — null ở nơi khác. */
  latestValue: number | null
  latestMeasuredAt: string | null
  /** Mốc sớm nhất kênh có số đo liền mạch (V13) — NULL với GATEWAY_PIN. */
  oldestReadingAt: string | null
}

/** Một ô trong mẫu bố cục. `w`/`h` là mong muốn — hàng thiếu ô sẽ giãn phần còn lại cho kín lưới. */
export interface TemplateEntry {
  type: WidgetType
  /** Mã chỉ số cần gán (VALUE/LINE). Widget theo đơn vị (DEVICE_*) không có. */
  metric?: string
  w: number
  h: number
}

/**
 * Mẫu bố cục — hằng số phía FE (xem lib/dashboardTemplates.ts), KHÔNG còn là bản ghi trong DB.
 * Khai theo hàng chứ không theo toạ độ tuyệt đối: bỏ một ô thì chỉ hàng đó co lại.
 */
export interface DashboardTemplate {
  id: string
  name: string
  description: string
  rows: TemplateEntry[][]
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
