import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AlertTriangle, ChevronLeft, ChevronRight, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { StepBar } from '@/components/datasources/StepBar'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  updateExternalSourceSchema,
  type UpdateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useTestSavedConnectionMutation } from '@/queries/useTestSavedConnectionMutation'
import { useUpdateExternalSourceMutation } from '@/queries/useUpdateExternalSourceMutation'
import type { ExternalSource } from '@/types/externalSource'

const SSL_MODES = ['disable', 'require', 'prefer']

const CONNECTION_FIELDS = ['host', 'port', 'database', 'password'] as const

const STEPS = [
  {
    title: 'Kết nối',
    description: 'Sửa chỗ trỏ tới database. Đổi gì ở đây thì phải thử lại trước khi đi tiếp.',
  },
  { title: 'Thông tin nguồn', description: 'Đặt lại tên hiển thị của nguồn.' },
] as const

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
  const [step, setStep] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    trigger,
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
    setStep(0)
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
    values.host !== source.connectionConfig.host ||
    values.database !== source.connectionConfig.database

  // Endpoint trả 200 kèm ok=false khi không kết nối được, nên thất bại nằm ở onSuccess.
  function runTest() {
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
        onError: (error) =>
          toast.error(getApiErrorMessage(error, 'Không gọi được máy chủ để thử kết nối')),
      }
    )
  }

  // Không đổi gì ở bước 1 thì không có gì để thử. Bắt thử lại một kết nối đã lưu chỉ để đổi tên
  // sẽ khoá luôn việc đổi tên khi database bên kia đang sập — đúng lúc cần đánh dấu nguồn hỏng.
  async function handleNext() {
    if (!(await trigger([...CONNECTION_FIELDS]))) return
    if (connectionChanged) {
      runTest()
      return
    }
    setStep(1)
  }

  function onSubmit(formValues: UpdateExternalSourceFormValues) {
    // Backend coi thiếu connectionConfig/credential là "giữ nguyên" — chỉ gửi khi đủ bộ.
    const connectionConfig =
      formValues.host && formValues.port && formValues.database
        ? {
            host: formValues.host,
            port: Number(formValues.port),
            database: formValues.database,
            sslMode: formValues.sslMode || null,
          }
        : undefined
    const credential =
      formValues.username && formValues.password
        ? { username: formValues.username, password: formValues.password }
        : undefined

    updateMutation.mutate(
      { id: source.id, payload: { name: formValues.name, connectionConfig, credential } },
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa nguồn dữ liệu</DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        <StepBar steps={STEPS} step={step} />

        {/* Enter ở bước 1 phải là "đi tiếp", không phải submit — submit lúc đó validate cả tên
            chưa hiện ra, đổ lỗi vào ô người dùng không nhìn thấy. */}
        <form
          className="flex flex-col gap-6"
          onSubmit={
            step === 0
              ? (event) => {
                  event.preventDefault()
                  void handleNext()
                }
              : handleSubmit(onSubmit)
          }
          noValidate
        >
          {step === 0 ? (
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field className="sm:col-span-2" data-invalid={!!errors.host}>
                  <FieldLabel htmlFor="edit-source-host" data-required>
                    Host
                  </FieldLabel>
                  <Input
                    id="edit-source-host"
                    autoFocus
                    aria-invalid={!!errors.host}
                    {...register('host')}
                  />
                  <FieldError errors={[errors.host]} />
                </Field>
                <Field data-invalid={!!errors.port}>
                  <FieldLabel htmlFor="edit-source-port" data-required>
                    Port
                  </FieldLabel>
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
                  <FieldLabel htmlFor="edit-source-database" data-required>
                    Database
                  </FieldLabel>
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
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="edit-source-password">Password mới</FieldLabel>
                  <Input
                    id="edit-source-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  <FieldError errors={[errors.password]} />
                </Field>
                <FieldDescription className="sm:col-span-2">
                  Bỏ trống để giữ nguyên tài khoản đang dùng.
                </FieldDescription>
              </div>

              {pointsElsewhere && jobCount > 0 && (
                <p className="flex items-start gap-2 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Đang trỏ sang database khác. {jobCount} job trên nguồn này viết theo cấu trúc
                    bảng cũ và sẽ lỗi nếu database mới không có đúng bảng, cột đó.
                  </span>
                </p>
              )}
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="edit-source-name" data-required>
                  Tên nguồn
                </FieldLabel>
                <Input
                  id="edit-source-name"
                  autoFocus
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
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
                <Button type="button" onClick={handleNext} disabled={testMutation.isPending}>
                  {testMutation.isPending && <Spinner data-icon="inline-start" />}
                  {!testMutation.isPending && connectionChanged && <PlugZap data-icon="inline-start" />}
                  {connectionChanged ? 'Kiểm tra kết nối' : 'Tiếp tục'}
                  {!connectionChanged && <ChevronRight data-icon="inline-end" />}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft data-icon="inline-start" />
                  Quay lại
                </Button>
                <LoadingButton type="submit" isPending={updateMutation.isPending}>
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
