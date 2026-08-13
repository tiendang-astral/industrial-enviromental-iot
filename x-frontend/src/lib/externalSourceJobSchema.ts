import { z } from 'zod'

export const FILTER_OPERATORS = ['=', '!=', '>', '<', '>=', '<='] as const

export const externalSourceFilterSchema = z.object({
  column: z.string().min(1, 'Nhập tên cột'),
  operator: z.enum(FILTER_OPERATORS),
  value: z.string().min(1, 'Nhập giá trị'),
})

export const externalSourceJobSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên job'),
  table: z.string().min(1, 'Vui lòng nhập tên bảng'),
  timestampColumn: z.string().min(1, 'Vui lòng nhập cột thời gian'),
  valueColumns: z.string().min(1, 'Vui lòng nhập ít nhất 1 cột dữ liệu (cách nhau bằng dấu phẩy)'),
  filters: z.array(externalSourceFilterSchema),
  scheduleCron: z.string().min(1, 'Vui lòng nhập lịch chạy (cron 5 field, VD */5 * * * *)'),
})

export type ExternalSourceJobFormValues = z.infer<typeof externalSourceJobSchema>

export const createDatastreamSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên datastream'),
  metricId: z.string().min(1, 'Vui lòng chọn metric'),
  sourceField: z.string().min(1, 'Vui lòng chọn field'),
})

export type CreateDatastreamFormValues = z.infer<typeof createDatastreamSchema>
