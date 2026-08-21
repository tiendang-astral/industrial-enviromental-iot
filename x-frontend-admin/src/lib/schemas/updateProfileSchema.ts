import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  // Để trống = gỡ email. Backend nhận null và bỏ qua ràng buộc unique.
  email: z.union([z.email('Email không hợp lệ'), z.literal('')]),
})

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>
