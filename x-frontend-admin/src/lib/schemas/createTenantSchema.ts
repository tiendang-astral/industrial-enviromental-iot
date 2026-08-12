import { z } from 'zod'

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên tenant'),
  email: z.email('Email không hợp lệ'),
  adminUsername: z.string().min(1, 'Vui lòng nhập username admin'),
  adminFullName: z.string().min(1, 'Vui lòng nhập họ tên admin'),
  adminEmail: z.union([z.email('Email không hợp lệ'), z.literal('')]).optional(),
  adminPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

export type CreateTenantFormValues = z.infer<typeof createTenantSchema>
