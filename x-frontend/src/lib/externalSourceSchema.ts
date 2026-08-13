import { z } from 'zod'

export const createExternalSourceSchema = z.object({
  tenantNodeId: z.string().min(1, 'Vui lòng chọn node'),
  name: z.string().min(1, 'Vui lòng nhập tên nguồn'),
  host: z.string().min(1, 'Vui lòng nhập host'),
  port: z
    .string()
    .min(1, 'Vui lòng nhập port')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, 'Port không hợp lệ'),
  database: z.string().min(1, 'Vui lòng nhập database'),
  sslMode: z.string().optional(),
  username: z.string().min(1, 'Vui lòng nhập username'),
  password: z.string().min(1, 'Vui lòng nhập password'),
})

export type CreateExternalSourceFormValues = z.infer<typeof createExternalSourceSchema>

// connectionConfig/credential bỏ trống = giữ nguyên (khớp UpdateExternalSourceRequest backend).
export const updateExternalSourceSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên nguồn'),
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  sslMode: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
})

export type UpdateExternalSourceFormValues = z.infer<typeof updateExternalSourceSchema>
