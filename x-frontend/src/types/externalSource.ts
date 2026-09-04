export interface ExternalSourceConnectionConfig {
  host: string
  port: number
  database: string
  sslMode: string | null
}

export interface ExternalSourceCredential {
  username: string
  password: string
}

export interface ExternalSource {
  id: number
  tenantNodeId: number
  name: string
  connectionType: 'POSTGRESQL'
  connectionConfig: ExternalSourceConnectionConfig
  lastSyncStatus: string | null
  lastSyncAt: string | null
  lastError: string | null
}

export interface CreateExternalSourceRequest {
  name: string
  connectionType: 'POSTGRESQL'
  connectionConfig: ExternalSourceConnectionConfig
  credential: ExternalSourceCredential
}

export interface UpdateExternalSourceRequest {
  name: string
  connectionConfig?: ExternalSourceConnectionConfig
  credential?: ExternalSourceCredential
}

export interface ExternalSourceQueryConfig {
  /** Câu SELECT do người dùng viết, bắt buộc chứa :cursor ở điều kiện thời gian. */
  sql: string
  /** Tên cột thời gian trong KẾT QUẢ (bí danh nếu có AS). */
  timestampColumn: string
}

export type StartFrom = 'NEW_ONLY' | 'ALL_HISTORY' | 'FROM_DATE'

export interface ExternalSourceJob {
  id: number
  externalSourceId: number
  name: string
  queryConfig: ExternalSourceQueryConfig
  scheduleCron: string
  incrementalCursor: string | null
  totalRowCount: number
  lastRunStatus: 'RUNNING' | 'SUCCESS' | 'FAILED' | null
  lastRunAt: string | null
  nextRunAt: string | null
  lastError: string | null
}

export interface CreateExternalSourceJobRequest {
  name: string
  queryConfig: ExternalSourceQueryConfig
  scheduleCron: string
  startFrom: StartFrom
  startFromDate?: string
}

export interface UpdateExternalSourceJobRequest {
  name: string
  queryConfig?: ExternalSourceQueryConfig
  scheduleCron?: string
}

export interface ExternalSourceJobRun {
  id: number
  status: 'RUNNING' | 'SUCCESS' | 'FAILED'
  rowCount: number
  error: string | null
  startedAt: string
  finishedAt: string | null
}

export interface TestConnectionResult {
  ok: boolean
  serverVersion: string | null
  latencyMs: number | null
  tableCount: number | null
  writable: boolean
  errorCode: string | null
  errorMessage: string | null
}

export interface SchemaColumn {
  name: string
  dataType: string
  timestamp: boolean
  numeric: boolean
}

export interface SchemaTable {
  schema: string
  name: string
  estimatedRows: number | null
  columns: SchemaColumn[]
}

export interface PreviewColumn {
  name: string
  dataType: string
  numeric: boolean
}

export interface PreviewResult {
  columns: PreviewColumn[]
  rows: (string | number | boolean | null)[][]
  rowCount: number
  elapsedMs: number
}

/** Tác vụ đọc lại lịch sử cho 1 kênh dữ liệu (V13). */
export interface BackfillTask {
  id: number
  datastreamId: number
  /** Đích cần vá tới. */
  targetFrom: string
  /** Cận trên của dải cần vá — nơi dữ liệu hiện có bắt đầu. */
  coveredFrom: string
  /** Đang lùi tới đâu; chạy mới → cũ nên giá trị này giảm dần. */
  cursorAt: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  rowCount: number
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  progressPercent: number | null
}

export interface BackfillRequest {
  startFrom: StartFrom
  startFromDate?: string
}

export interface BackfillEstimate {
  /** null = đếm quá lâu và đã bị dừng; chỉ hiện khoảng thời gian. */
  rowCount: number | null
  targetFrom: string
  coveredFrom: string
  elapsedMs: number
}

/** Số đo của 1 kênh dữ liệu external, gộp metadata + lịch sử từ InfluxDB. */
export interface DatastreamTelemetry {
  datastreamId: number
  name: string
  sourceField: string
  metricCode: string | null
  unit: string | null
  latestValue: number | null
  latestMeasuredAt: string | null
  oldestReadingAt: string | null
  history: { value: number; measuredAt: string }[]
}
