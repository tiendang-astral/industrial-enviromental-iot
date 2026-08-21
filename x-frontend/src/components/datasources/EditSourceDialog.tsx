import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  updateExternalSourceSchema,
  type UpdateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useUpdateExternalSourceMutation } from '@/queries/useUpdateExternalSourceMutation'
import type { ExternalSource } from '@/types/externalSource'

const SSL_MODES = ['disable', 'require', 'prefer']

export function EditSourceDialog({
  source,
  open,
  onOpenChange,
}: {
  source: ExternalSource
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateExternalSourceMutation()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateExternalSourceFormValues>({
    resolver: zodResolver(updateExternalSourceSchema),
    defaultValues: {
      name: '',
      host: '',
      port: '',
      database: '',
      sslMode: '',
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: source.name,
      host: source.connectionConfig.host,
      port: String(source.connectionConfig.port),
      database: source.connectionConfig.database,
      sslMode: source.connectionConfig.sslMode ?? '',
      username: '',
      password: '',
    })
  }, [open, source, reset])

  function onSubmit(values: UpdateExternalSourceFormValues) {
    // Backend coi thiếu connectionConfig/credential là "giữ nguyên" — chỉ gửi khi đủ bộ.
    const connectionConfig =
      values.host && values.port && values.database
        ? {
            host: values.host,
            port: Number(values.port),
            database: values.database,
            sslMode: values.sslMode || null,
          }
        : undefined
    const credential =
      values.username && values.password
        ? { username: values.username, password: values.password }
        : undefined

    updateMutation.mutate(
      { id: source.id, payload: { name: values.name, connectionConfig, credential } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Cập nhật nguồn dữ liệu thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sửa nguồn dữ liệu"
      description="Đổi kết nối sẽ áp dụng cho toàn bộ job của nguồn này ở lần chạy kế tiếp."
      isPending={updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="edit-source-name">Tên nguồn</FieldLabel>
        <Input id="edit-source-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field className="sm:col-span-2" data-invalid={!!errors.host}>
          <FieldLabel htmlFor="edit-source-host">Host</FieldLabel>
          <Input id="edit-source-host" aria-invalid={!!errors.host} {...register('host')} />
          <FieldError errors={[errors.host]} />
        </Field>
        <Field data-invalid={!!errors.port}>
          <FieldLabel htmlFor="edit-source-port">Port</FieldLabel>
          <Input
            id="edit-source-port"
            type="number"
            aria-invalid={!!errors.port}
            {...register('port')}
          />
          <FieldError errors={[errors.port]} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.database}>
          <FieldLabel htmlFor="edit-source-database">Database</FieldLabel>
          <Input
            id="edit-source-database"
            aria-invalid={!!errors.database}
            {...register('database')}
          />
          <FieldError errors={[errors.database]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-source-ssl">SSL mode</FieldLabel>
          <Controller
            control={control}
            name="sslMode"
            render={({ field }) => (
              <Select value={field.value || 'disable'} onValueChange={field.onChange}>
                <SelectTrigger id="edit-source-ssl" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SSL_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="edit-source-username">Username mới</FieldLabel>
          <Input id="edit-source-username" autoComplete="off" {...register('username')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-source-password">Password mới</FieldLabel>
          <Input
            id="edit-source-password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        <FieldDescription className="sm:col-span-2">
          Bỏ trống cả hai ô để giữ nguyên thông tin đăng nhập đang dùng. Mật khẩu đã lưu không đọc
          lại được nên không hiển thị ở đây.
        </FieldDescription>
      </div>
    </FormDialog>
  )
}
