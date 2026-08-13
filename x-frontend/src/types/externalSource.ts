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

export interface ExternalSourceFilter {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<='
  value: string
}

export interface ExternalSourceQueryConfig {
  table: string
  timestampColumn: string
  valueColumns: string[]
}

export interface ExternalSourceJob {
  id: number
  externalSourceId: number
  name: string
  queryConfig: ExternalSourceQueryConfig
  filterConfig: ExternalSourceFilter[] | null
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
  filterConfig?: ExternalSourceFilter[]
  scheduleCron: string
}

export interface UpdateExternalSourceJobRequest {
  name: string
  queryConfig?: ExternalSourceQueryConfig
  filterConfig?: ExternalSourceFilter[]
  scheduleCron?: string
}
