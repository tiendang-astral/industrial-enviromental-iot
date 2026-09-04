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

// credential bỏ trống = giữ nguyên (khớp UpdateExternalSourceRequest backend). Nhưng host/port/
// database thì KHÔNG optional: form điền sẵn giá trị hiện tại, xoá đi là gửi connectionConfig
// rỗng và ăn 400 từ @NotBlank/@NotNull — chặn tại đây để lỗi hiện ngay dưới ô thay vì từ server.
export const updateExternalSourceSchema = z
  .object({
    name: z.string().min(1, 'Vui lòng nhập tên nguồn'),
    host: z.string().min(1, 'Vui lòng nhập host'),
    port: z
      .string()
      .min(1, 'Vui lòng nhập port')
      .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, 'Port không hợp lệ'),
    database: z.string().min(1, 'Vui lòng nhập database'),
    sslMode: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  })
  // Đổi credential cần cả hai: điền mỗi username rồi Lưu thì thay đổi bị bỏ qua không báo gì.
  .refine((v) => !v.username === !v.password, {
    message: 'Đổi tài khoản thì phải nhập cả username và password',
    path: ['password'],
  })

export type UpdateExternalSourceFormValues = z.infer<typeof updateExternalSourceSchema>
