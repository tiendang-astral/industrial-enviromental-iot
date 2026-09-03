import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
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
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  createExternalSourceSchema,
  type CreateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useCreateExternalSourceMutation } from '@/queries/useCreateExternalSourceMutation'
import { useTestConnectionMutation } from '@/queries/useTestConnectionMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { TestConnectionResult } from '@/types/externalSource'

const SSL_MODES = [
  { value: 'disable', label: 'disable' },
  { value: 'require', label: 'require' },
  { value: 'prefer', label: 'prefer' },
]

export function ExternalSourceFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: nodes } = useTenantNodesQuery()
  const createMutation = useCreateExternalSourceMutation()
  const testMutation = useTestConnectionMutation()
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { errors },
  } = useForm<CreateExternalSourceFormValues>({
    resolver: zodResolver(createExternalSourceSchema),
    defaultValues: {
      tenantNodeId: '',
      name: '',
      host: '',
      port: '5432',
      database: '',
      sslMode: '',
      username: '',
      password: '',
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      setTestResult(null)
    }
    onOpenChange(next)
  }

  // Kết nối phải thử được trước khi lưu — nếu không, lỗi chỉ lộ ra khi job chạy theo lịch,
  // lúc người tạo đã rời trang (xem context/ARCHITECTURE.md § Flow: External source data).
  function handleTest() {
    const values = getValues()
    if (!values.host || !values.database || !values.username || !values.password) {
      toast.error('Điền đủ host, database, tài khoản và mật khẩu trước khi thử kết nối')
      return
    }
    testMutation.mutate(
      {
        connectionConfig: {
          host: values.host,
          port: Number(values.port),
          database: values.database,
          sslMode: values.sslMode || null,
        },
        credential: { username: values.username, password: values.password },
      },
      {
        onSuccess: setTestResult,
        onError: () => toast.error('Không gọi được máy chủ để thử kết nối'),
      }
    )
  }

  function onSubmit(values: CreateExternalSourceFormValues) {
    createMutation.mutate(
      {
        tenantNodeId: Number(values.tenantNodeId),
        payload: {
          name: values.name,
          connectionType: 'POSTGRESQL',
          connectionConfig: {
            host: values.host,
            port: Number(values.port),
            database: values.database,
            sslMode: values.sslMode || null,
          },
          credential: { username: values.username, password: values.password },
        },
      },
      {
        onSuccess: () => {
          handleOpenChange(false)
          toast.success('Tạo nguồn dữ liệu thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo nguồn dữ liệu thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Thêm nguồn dữ liệu"
      submitLabel="Lưu & mở nguồn"
      isPending={createMutation.isPending}
      submitDisabled={!testResult?.ok}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.tenantNodeId}>
        <FieldLabel htmlFor="source-node" data-required>
          Chọn tổ chức
        </FieldLabel>
        <Controller
          control={control}
          name="tenantNodeId"
          render={({ field }) => (
            <TenantNodePicker
              id="source-node"
              mode="single"
              nodes={nodes ?? []}
              value={field.value ? Number(field.value) : null}
              onChange={(id) => field.onChange(String(id))}
              invalid={!!errors.tenantNodeId}
            />
          )}
        />
        <FieldError errors={[errors.tenantNodeId]} />
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="source-name" data-required>Tên nguồn</FieldLabel>
        <Input id="source-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field className="sm:col-span-2" data-invalid={!!errors.host}>
          <FieldLabel htmlFor="source-host" data-required>Host</FieldLabel>
          <Input
            id="source-host"
            placeholder="203.0.113.10"
            aria-invalid={!!errors.host}
            {...register('host')}
          />
          <FieldError errors={[errors.host]} />
        </Field>
        <Field data-invalid={!!errors.port}>
          <FieldLabel htmlFor="source-port" data-required>Port</FieldLabel>
          <Input id="source-port" type="number" aria-invalid={!!errors.port} {...register('port')} />
          <FieldError errors={[errors.port]} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.database}>
          <FieldLabel htmlFor="source-database" data-required>Database</FieldLabel>
          <Input id="source-database" aria-invalid={!!errors.database} {...register('database')} />
          <FieldError errors={[errors.database]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="source-ssl">SSL mode</FieldLabel>
          <Controller
            control={control}
            name="sslMode"
            render={({ field }) => (
              <Select value={field.value || 'disable'} onValueChange={field.onChange}>
                <SelectTrigger id="source-ssl" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SSL_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
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
        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="source-username" data-required>Username</FieldLabel>
          <Input id="source-username" aria-invalid={!!errors.username} {...register('username')} />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="source-password" data-required>Password</FieldLabel>
          <Input
            id="source-password"
            type="password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </div>

      <ConnectionTestRow
        result={testResult}
        isPending={testMutation.isPending}
        onTest={handleTest}
      />
    </FormDialog>
  )
}
