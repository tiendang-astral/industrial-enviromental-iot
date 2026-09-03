import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { PasswordStrength } from '@/components/patterns/PasswordStrength'
import { getApiErrorMessage } from '@/lib/apiError'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/tenantUserSchema'
import { useResetTenantUserPasswordMutation } from '@/queries/useTenantUserMutations'
import type { TenantUser } from '@/types/tenantUser'

export function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: TenantUser | null
  onOpenChange: (open: boolean) => void
}) {
  const resetMutation = useResetTenantUserPasswordMutation()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '' },
  })

  useEffect(() => {
    if (user) reset({ newPassword: '' })
  }, [user, reset])

  if (!user) return null

  function onSubmit(values: ResetPasswordFormValues) {
    if (!user) return
    resetMutation.mutate(
      { id: user.id, payload: { newPassword: values.newPassword } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã đặt lại mật khẩu')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Đặt lại mật khẩu thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Đặt lại mật khẩu cho "${user.username}"`}
      description="Mọi phiên đăng nhập đang mở của tài khoản này sẽ bị thu hồi ngay sau khi lưu."
      submitLabel="Đặt lại"
      isPending={resetMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.newPassword}>
        <FieldLabel htmlFor="reset-password" data-required>Mật khẩu mới</FieldLabel>
        <Input
          id="reset-password"
          type="password"
          autoFocus
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...register('newPassword')}
        />
        <PasswordStrength password={watch('newPassword') ?? ''} />
        <FieldError errors={[errors.newPassword]} />
      </Field>
    </FormDialog>
  )
}
