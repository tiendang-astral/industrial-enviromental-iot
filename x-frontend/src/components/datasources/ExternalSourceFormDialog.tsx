import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ChevronLeft, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { StepBar } from '@/components/datasources/StepBar'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  createExternalSourceSchema,
  type CreateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useCreateExternalSourceMutation } from '@/queries/useCreateExternalSourceMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useTestConnectionMutation } from '@/queries/useTestConnectionMutation'

const SSL_MODES = [
  { value: 'disable', label: 'disable' },
  { value: 'require', label: 'require' },
  { value: 'prefer', label: 'prefer' },
]

const CONNECTION_FIELDS = ['host', 'port', 'database', 'username', 'password'] as const

const STEPS = [
  { title: 'Kết nối', description: 'Trỏ tới database cần lấy dữ liệu. Phải kết nối được mới đi tiếp.' },
  { title: 'Thông tin nguồn', description: 'Đặt tên và chọn đơn vị sở hữu nguồn này.' },
]

/**
 * Hai bước, không phải một form dài: kết nối được rồi mới đặt tên. Đảo lại thì người dùng gõ xong
 * tên và chọn đơn vị mới phát hiện sai mật khẩu — công gõ đổ đi. Bước 2 chỉ tới được qua một lần
 * thử kết nối thành công, nên không có đường lưu một nguồn chết.
 */
export function ExternalSourceFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { data: nodes } = useTenantNodesQuery()
  const createMutation = useCreateExternalSourceMutation()
  const testMutation = useTestConnectionMutation()
  const [step, setStep] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    trigger,
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

  useEffect(() => {
    if (!open) return
    reset()
    setStep(0)
  }, [open, reset])

  function connectionPayload() {
    const values = getValues()
    return {
      connectionConfig: {
        host: values.host,
        port: Number(values.port),
        database: values.database,
        sslMode: values.sslMode || null,
      },
      credential: { username: values.username, password: values.password },
    }
  }

  // Endpoint trả 200 kèm ok=false khi không kết nối được, nên thất bại nằm ở onSuccess.
  async function handleTest() {
    const valid = await trigger([...CONNECTION_FIELDS])
    if (!valid) return

    testMutation.mutate(connectionPayload(), {
      onSuccess: (result) => {
        if (!result.ok) {
          toast.error(result.errorMessage ?? 'Không kết nối được tới máy chủ')
          return
        }
        if (result.writable) {
          toast.warning('Kết nối được. Tài khoản có quyền ghi — nên dùng tài khoản chỉ đọc.')
        } else {
          toast.success('Kết nối được')
        }
        setStep(1)
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Không gọi được máy chủ để thử kết nối')),
    })
  }

  function onSubmit(values: CreateExternalSourceFormValues) {
    createMutation.mutate(
      {
        tenantNodeId: Number(values.tenantNodeId),
        payload: {
          name: values.name,
          connectionType: 'POSTGRESQL',
          ...connectionPayload(),
        },
      },
      {
        onSuccess: (source) => {
          onOpenChange(false)
          toast.success('Tạo nguồn dữ liệu thành công')
          navigate(`/data-sources/${source.id}/config`)
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo nguồn dữ liệu thất bại')),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm nguồn dữ liệu</DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        <StepBar steps={STEPS} step={step} />

        {/* Enter ở bước 1 phải là "thử kết nối", không phải submit — submit lúc đó sẽ validate cả
            tên và đơn vị chưa hiện ra, đổ lỗi vào những ô người dùng không nhìn thấy. */}
        <form
          className="flex flex-col gap-6"
          onSubmit={
            step === 0
              ? (event) => {
                  event.preventDefault()
                  void handleTest()
                }
              : handleSubmit(onSubmit)
          }
          noValidate
        >
          {step === 0 ? (
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field className="sm:col-span-2" data-invalid={!!errors.host}>
                  <FieldLabel htmlFor="source-host" data-required>
                    Host
                  </FieldLabel>
                  <Input
                    id="source-host"
                    autoFocus
                    placeholder="203.0.113.10"
                    aria-invalid={!!errors.host}
                    {...register('host')}
                  />
                  <FieldError errors={[errors.host]} />
                </Field>
                <Field data-invalid={!!errors.port}>
                  <FieldLabel htmlFor="source-port" data-required>
                    Port
                  </FieldLabel>
                  <Input
                    id="source-port"
                    type="number"
                    aria-invalid={!!errors.port}
                    {...register('port')}
                  />
                  <FieldError errors={[errors.port]} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={!!errors.database}>
                  <FieldLabel htmlFor="source-database" data-required>
                    Database
                  </FieldLabel>
                  <Input
                    id="source-database"
                    aria-invalid={!!errors.database}
                    {...register('database')}
                  />
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
                  <FieldLabel htmlFor="source-username" data-required>
                    Username
                  </FieldLabel>
                  <Input
                    id="source-username"
                    aria-invalid={!!errors.username}
                    {...register('username')}
                  />
                  <FieldError errors={[errors.username]} />
                </Field>
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="source-password" data-required>
                    Password
                  </FieldLabel>
                  <Input
                    id="source-password"
                    type="password"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  <FieldError errors={[errors.password]} />
                </Field>
              </div>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field data-invalid={!!errors.tenantNodeId}>
                <FieldLabel htmlFor="source-node" data-required>
                  Đơn vị
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
                      placeholder="Chọn đơn vị"
                      invalid={!!errors.tenantNodeId}
                    />
                  )}
                />
                <FieldError errors={[errors.tenantNodeId]} />
              </Field>

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="source-name" data-required>
                  Tên nguồn
                </FieldLabel>
                <Input id="source-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
                <FieldError errors={[errors.name]} />
              </Field>
            </FieldGroup>
          )}

          {/* Footer cùng màu với thân dialog, xem ghi chú ở ConfirmDialog. */}
          <DialogFooter className="border-t-0 bg-transparent">
            {step === 0 ? (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="button" onClick={handleTest} disabled={testMutation.isPending}>
                  {testMutation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <PlugZap data-icon="inline-start" />
                  )}
                  Kiểm tra kết nối
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft data-icon="inline-start" />
                  Quay lại
                </Button>
                <LoadingButton type="submit" isPending={createMutation.isPending}>
                  Lưu
                </LoadingButton>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
