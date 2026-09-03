import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
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
import { ConnectionTestRow } from '@/components/datasources/ConnectionTestRow'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  updateExternalSourceSchema,
  type UpdateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useTestSavedConnectionMutation } from '@/queries/useTestSavedConnectionMutation'
import { useUpdateExternalSourceMutation } from '@/queries/useUpdateExternalSourceMutation'
import type { ExternalSource, TestConnectionResult } from '@/types/externalSource'

const SSL_MODES = ['disable', 'require', 'prefer']

export function EditSourceDialog({
  source,
  jobCount = 0,
  open,
  onOpenChange,
}: {
  source: ExternalSource
  /** Số job đang chạy trên nguồn — dùng để nêu hậu quả cụ thể khi đổi host/database. */
  jobCount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateExternalSourceMutation()
  const testMutation = useTestSavedConnectionMutation(source.id)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
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
    setTestResult(null)
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

  const values = watch()
  const endpointChanged =
    values.host !== source.connectionConfig.host ||
    Number(values.port) !== source.connectionConfig.port ||
    values.database !== source.connectionConfig.database ||
    (values.sslMode || null) !== source.connectionConfig.sslMode
  const credentialChanged = !!values.username && !!values.password
  const connectionChanged = endpointChanged || credentialChanged
  // Đổi host/database là trỏ sang database khác — schema có thể khác hẳn, job đang chạy sẽ hỏng.
  const pointsElsewhere =
    values.host !== source.connectionConfig.host || values.database !== source.connectionConfig.database

  function handleTest() {
    testMutation.mutate(
      {
        connectionConfig: endpointChanged
          ? {
              host: values.host ?? '',
              port: Number(values.port),
              database: values.database ?? '',
              sslMode: values.sslMode || null,
            }
          : undefined,
        credential: credentialChanged
          ? { username: values.username ?? '', password: values.password ?? '' }
          : undefined,
      },
      {
        onSuccess: setTestResult,
        onError: () => toast.error('Không gọi được máy chủ để thử kết nối'),
      }
    )
  }

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
      isPending={updateMutation.isPending}
      submitDisabled={connectionChanged && !testResult?.ok}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="edit-source-name" data-required>Tên nguồn</FieldLabel>
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
          Bỏ trống để giữ nguyên tài khoản đang dùng.
        </FieldDescription>
      </div>

      {connectionChanged && (
        <ConnectionTestRow
          result={testResult}
          isPending={testMutation.isPending}
          onTest={handleTest}
        />
      )}

      {pointsElsewhere && jobCount > 0 && (
        <p className="flex items-start gap-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Đang trỏ sang database khác. {jobCount} job trên nguồn này viết theo cấu trúc bảng cũ và sẽ
            lỗi nếu database mới không có đúng bảng, cột đó.
          </span>
        </p>
      )}
    </FormDialog>
  )
}
