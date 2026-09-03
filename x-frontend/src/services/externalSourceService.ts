import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  CreateExternalSourceRequest,
  ExternalSource,
  ExternalSourceConnectionConfig,
  ExternalSourceCredential,
  PreviewResult,
  SchemaTable,
  TestConnectionResult,
  UpdateExternalSourceRequest,
} from '@/types/externalSource'

export async function listExternalSources(): Promise<ExternalSource[]> {
  const { data } = await httpClient.get<ApiEnvelope<ExternalSource[]>>('/external-sources')
  return data.data!
}

export async function createExternalSource(
  tenantNodeId: number,
  payload: CreateExternalSourceRequest
): Promise<ExternalSource> {
  const { data } = await httpClient.post<ApiEnvelope<ExternalSource>>(
    `/tenant-nodes/${tenantNodeId}/external-sources`,
    payload
  )
  return data.data!
}

export async function updateExternalSource(id: number, payload: UpdateExternalSourceRequest): Promise<ExternalSource> {
  const { data } = await httpClient.put<ApiEnvelope<ExternalSource>>(`/external-sources/${id}`, payload)
  return data.data!
}

export async function deleteExternalSource(id: number): Promise<void> {
  await httpClient.delete(`/external-sources/${id}`)
}

export async function testConnection(
  connectionConfig: ExternalSourceConnectionConfig,
  credential: ExternalSourceCredential
): Promise<TestConnectionResult> {
  const { data } = await httpClient.post<ApiEnvelope<TestConnectionResult>>('/external-sources/test-connection', {
    connectionConfig,
    credential,
  })
  return data.data!
}

/** Bỏ trống phần nào thì backend dùng phần đã lưu — sửa host mà không nhập lại mật khẩu vẫn thử được. */
export async function testSavedConnection(
  id: number,
  override?: {
    connectionConfig?: ExternalSourceConnectionConfig
    credential?: ExternalSourceCredential
  }
): Promise<TestConnectionResult> {
  const { data } = await httpClient.post<ApiEnvelope<TestConnectionResult>>(
    `/external-sources/${id}/test-connection`,
    override ?? {}
  )
  return data.data!
}

export async function getExternalSourceSchema(id: number): Promise<SchemaTable[]> {
  const { data } = await httpClient.get<ApiEnvelope<SchemaTable[]>>(`/external-sources/${id}/schema`)
  return data.data!
}

export async function previewQuery(id: number, sql: string, timestampColumn: string): Promise<PreviewResult> {
  const { data } = await httpClient.post<ApiEnvelope<PreviewResult>>(`/external-sources/${id}/preview`, {
    sql,
    timestampColumn,
  })
  return data.data!
}
