import { z } from 'zod'

/** Khớp @Size(min = 6) ở backend — đổi một bên thì phải đổi cả hai. */
const MIN_PASSWORD = 6

/**
 * Một schema duy nhất cho cả Thêm và Sửa. `username`/`password` chỉ bắt buộc khi tạo mới (form
 * Sửa không hiện 2 field đó: username đã nằm trong JWT đang phát hành, mật khẩu có luồng "Đặt lại"
 * riêng). Dùng chung schema thay vì hai schema rời để `formState.errors` không bị thu hẹp thành
 * kiểu union — hai `useForm` khác kiểu trong cùng một component thì TypeScript không gộp được.
 */
export function tenantUserSchema(isEdit: boolean) {
  return z
    .object({
      username: z.string().trim().optional(),
      fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
      /* Để trống gửi lên thành `null` chứ không phải `''`: unique index của email là partial (bỏ
         qua NULL), nhưng nhiều bản ghi cùng chuỗi rỗng thì đụng nhau ngay ở user thứ hai. */
      email: z.string().trim().email('Email không hợp lệ').or(z.literal('')).optional(),
      password: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (isEdit) return

      const username = values.username ?? ''
      if (username.length < 3) {
        ctx.addIssue({
          code: 'custom',
          path: ['username'],
          message: 'Tên đăng nhập phải có ít nhất 3 ký tự',
        })
      } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        ctx.addIssue({
          code: 'custom',
          path: ['username'],
          message: 'Chỉ dùng chữ, số và các ký tự . _ -',
        })
      }

      if ((values.password ?? '').length < MIN_PASSWORD) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự`,
        })
      }
    })
}

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(MIN_PASSWORD, `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự`),
})

export type TenantUserFormValues = z.infer<ReturnType<typeof tenantUserSchema>>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
