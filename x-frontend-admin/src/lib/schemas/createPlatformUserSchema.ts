import { z } from 'zod'

export const createPlatformUserSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập username'),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

export type CreatePlatformUserFormValues = z.infer<typeof createPlatformUserSchema>
