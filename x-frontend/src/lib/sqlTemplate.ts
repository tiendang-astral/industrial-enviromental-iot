import type { SchemaTable } from '@/types/externalSource'
import { CURSOR_TOKEN } from '@/lib/externalSourceJobSchema'

/**
 * Sinh câu SQL đầu tiên khi người dùng bấm vào một bảng — mục tiêu là họ thấy dữ liệu thật
 * mà không phải gõ chữ nào. Ưu tiên cột thời gian đầu tiên làm mốc, lấy tối đa 6 cột số.
 */
export function buildStarterSql(table: SchemaTable): { sql: string; timestampColumn: string } | null {
  const timestampColumn = table.columns.find((column) => column.timestamp)
  if (!timestampColumn) return null

  const valueColumns = table.columns.filter((column) => column.numeric).slice(0, 6)
  const selected = [timestampColumn.name, ...valueColumns.map((column) => column.name)]
  const qualifiedTable = table.schema === 'public' ? table.name : `${table.schema}.${table.name}`

  const sql = [
    `SELECT ${selected.join(',\n       ')}`,
    `FROM   ${qualifiedTable}`,
    `WHERE  ${timestampColumn.name} > ${CURSOR_TOKEN}`,
    `ORDER  BY ${timestampColumn.name}`,
    `LIMIT  500`,
  ].join('\n')

  return { sql, timestampColumn: timestampColumn.name }
}

/** Gợi ý metric theo tên cột — chỉ là gợi ý, người dùng luôn đổi được. */
const METRIC_HINTS: Record<string, string[]> = {
  temperature: ['temp', 'nhiet', 'nhiệt'],
  humidity: ['humid', 'am', 'ẩm', 'rh'],
  co2: ['co2', 'carbon'],
  pm25: ['pm25', 'pm2_5', 'bui', 'bụi'],
  pressure: ['pressure', 'ap_suat', 'áp'],
  light: ['light', 'lux', 'anh_sang'],
  voltage: ['volt', 'dien_ap'],
  current: ['current', 'ampe', 'dong_dien'],
  power: ['power', 'watt', 'cong_suat'],
}

export function suggestMetricCode(columnName: string): string | null {
  const normalized = columnName.toLowerCase()
  for (const [code, hints] of Object.entries(METRIC_HINTS)) {
    if (hints.some((hint) => normalized.includes(hint))) return code
  }
  return null
}

export const CRON_PRESETS = [
  { label: 'mỗi phút', value: '* * * * *' },
  { label: 'mỗi 5 phút', value: '*/5 * * * *' },
  { label: 'mỗi 15 phút', value: '*/15 * * * *' },
  { label: 'mỗi giờ', value: '0 * * * *' },
] as const
