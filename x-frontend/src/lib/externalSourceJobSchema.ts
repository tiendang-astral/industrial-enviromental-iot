import { z } from 'zod'

// :cursor là hợp đồng giữa câu SQL và cơ chế đọc tăng dần — backend cũng validate lại
// (SqlQueryValidator), ở đây chặn sớm để người dùng thấy lỗi ngay khi gõ.
export const CURSOR_TOKEN = ':cursor'

export const externalSourceJobSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên job'),
  sql: z
    .string()
    .min(1, 'Vui lòng nhập câu truy vấn')
    .refine((value) => /^\s*(select|with)\b/i.test(value), 'Câu truy vấn phải bắt đầu bằng SELECT hoặc WITH')
    .refine(
      (value) => new RegExp(`${CURSOR_TOKEN}\\b`).test(value),
      'Câu truy vấn phải chứa :cursor ở điều kiện thời gian, ví dụ: WHERE measured_at > :cursor'
    ),
  timestampColumn: z.string().min(1, 'Vui lòng chọn cột thời gian'),
  scheduleCron: z.string().min(1, 'Vui lòng chọn lịch chạy'),
})

export type ExternalSourceJobFormValues = z.infer<typeof externalSourceJobSchema>

export const createDatastreamSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên kênh dữ liệu'),
  metricId: z.string().min(1, 'Vui lòng chọn metric'),
  sourceField: z.string().min(1, 'Vui lòng chọn cột'),
})

export type CreateDatastreamFormValues = z.infer<typeof createDatastreamSchema>
