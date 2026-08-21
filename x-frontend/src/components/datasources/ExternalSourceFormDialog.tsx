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
import { getApiErrorMessage } from '@/lib/apiError'
import {
  createExternalSourceSchema,
  type CreateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useCreateExternalSourceMutation } from '@/queries/useCreateExternalSourceMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

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

  const {
    register,
    handleSubmit,
    reset,
    control,
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
    if (!next) reset()
    onOpenChange(next)
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
      description="Kết nối một PostgreSQL ngoài. Thông tin đăng nhập được mã hóa trước khi lưu và không bao giờ đọc lại được."
      submitLabel="Tạo nguồn"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.tenantNodeId}>
        <FieldLabel htmlFor="source-node">Gắn vào node</FieldLabel>
        <Controller
          control={control}
          name="tenantNodeId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="source-node" aria-invalid={!!errors.tenantNodeId} className="w-full">
                <SelectValue placeholder="Chọn node" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {nodes?.map((node) => (
                    <SelectItem key={node.id} value={String(node.id)}>
                      {' '.repeat((node.depth - 1) * 2)}
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.tenantNodeId]} />
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="source-name">Tên nguồn</FieldLabel>
        <Input id="source-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field className="sm:col-span-2" data-invalid={!!errors.host}>
          <FieldLabel htmlFor="source-host">Host</FieldLabel>
          <Input
            id="source-host"
            placeholder="203.0.113.10"
            aria-invalid={!!errors.host}
            {...register('host')}
          />
          <FieldError errors={[errors.host]} />
        </Field>
        <Field data-invalid={!!errors.port}>
          <FieldLabel htmlFor="source-port">Port</FieldLabel>
          <Input id="source-port" type="number" aria-invalid={!!errors.port} {...register('port')} />
          <FieldError errors={[errors.port]} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.database}>
          <FieldLabel htmlFor="source-database">Database</FieldLabel>
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
          <FieldLabel htmlFor="source-username">Username</FieldLabel>
          <Input id="source-username" aria-invalid={!!errors.username} {...register('username')} />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="source-password">Password</FieldLabel>
          <Input
            id="source-password"
            type="password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </div>
    </FormDialog>
  )
}
