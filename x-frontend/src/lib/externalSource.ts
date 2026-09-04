import type { ExternalSource } from '@/types/externalSource'

/**
 * Chuỗi kết nối hiển thị. Dùng chung cho trang danh sách và trang chi tiết — hai màn hình nói
 * cùng một kiểu thì người dùng không phải đối chiếu hai định dạng khác nhau của cùng một nguồn.
 */
export function connectionString(source: ExternalSource) {
  const { host, port, database } = source.connectionConfig
  return `${host}:${port}/${database}`
}

/** SSL bật hay không — `null`/`disable` đều là tắt (mặc định của driver). */
export function isSslEnabled(source: ExternalSource) {
  const mode = source.connectionConfig.sslMode
  return !!mode && mode !== 'disable'
}
