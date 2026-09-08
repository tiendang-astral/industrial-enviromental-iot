/** Trần 7 ngày khớp retention bucket `raw` của InfluxDB (DATABASE.md §4). */
export const TELEMETRY_RANGES = [
  { minutes: 60, label: '1 giờ' },
  { minutes: 360, label: '6 giờ' },
  { minutes: 1440, label: '24 giờ' },
  { minutes: 10080, label: '7 ngày' },
] as const

export const DEFAULT_RANGE_MINUTES = 1440
