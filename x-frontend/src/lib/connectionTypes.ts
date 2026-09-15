import type { ConnectionType } from '@/types/externalSource'

interface ConnectionTypeSpec {
  label: string
  defaultPort: number
  /** Bảng thuộc schema này thì SQL mẫu bỏ tiền tố schema. `null` = không bao giờ thêm (MySQL: database chính là schema). */
  defaultSchema: string | null
  /** Cú pháp giới hạn số dòng trong SQL mẫu. */
  rowLimit: 'LIMIT' | 'TOP'
}

/** Nơi duy nhất ở FE giữ khác biệt giữa các loại database. Thêm loại mới: thêm `ConnectionType` và một mục ở đây. */
export const CONNECTION_TYPES: Record<ConnectionType, ConnectionTypeSpec> = {
  POSTGRESQL: { label: 'PostgreSQL', defaultPort: 5432, defaultSchema: 'public', rowLimit: 'LIMIT' },
  SQLSERVER: { label: 'SQL Server', defaultPort: 1433, defaultSchema: 'dbo', rowLimit: 'TOP' },
  MYSQL: { label: 'MySQL / MariaDB', defaultPort: 3306, defaultSchema: null, rowLimit: 'LIMIT' },
}

export const CONNECTION_TYPE_OPTIONS = Object.keys(CONNECTION_TYPES) as ConnectionType[]

export function connectionTypeLabel(type: string) {
  return CONNECTION_TYPES[type as ConnectionType]?.label ?? type
}

/**
 * "Mã hoá kết nối" lưu vào `sslMode`: có = `require`, không = `disable`. Backend dịch sang tham số driver
 * của từng loại (luôn mã hoá, không kiểm tra chứng chỉ). Giá trị cũ `prefer` vẫn tính là có mã hoá.
 */
export const ENCRYPTION_ON = 'require'
export const ENCRYPTION_OFF = 'disable'

export const ENCRYPTION_OPTIONS = [
  { value: ENCRYPTION_OFF, label: 'Không mã hoá' },
  { value: ENCRYPTION_ON, label: 'Có mã hoá' },
]

export function isEncryptionOn(sslMode: string | null | undefined) {
  return !!sslMode && sslMode !== ENCRYPTION_OFF
}
