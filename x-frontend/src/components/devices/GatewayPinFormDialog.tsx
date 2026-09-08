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
  createGatewayPinSchema,
  PIN_TYPE_DIRECTION,
  type CreateGatewayPinFormValues,
} from '@/lib/gatewayPinSchema'
import { useCreateGatewayPinMutation } from '@/queries/useCreateGatewayPinMutation'
import { useMetricsQuery } from '@/queries/useMetricsQuery'

const DEFAULTS: CreateGatewayPinFormValues = {
  type: 'AI',
  name: '',
  metricId: '',
  pinNumber: '1',
}

/** Nhãn trong ô chọn nói luôn chiều tín hiệu, để người dùng không phải nhớ AI/DO nghĩa là gì. */
const TYPE_OPTIONS = [
  { value: 'AI', label: 'AI (đầu vào)' },
  { value: 'DI', label: 'DI (đầu vào)' },
  { value: 'DO', label: 'DO (đầu ra)' },
  { value: 'AO', label: 'AO (đầu ra)' },
] as const

const TYPE_HINT: Record<string, string> = {
  AI: 'Analog In — đọc giá trị liên tục (nhiệt độ, độ ẩm)',
  DI: 'Digital In — đọc trạng thái bật/tắt (cảm biến cửa, báo mức)',
  DO: 'Digital Out — đóng/ngắt relay, chỉ có bật hoặc tắt (bơm, quạt, đèn)',
  AO: 'Analog Out — điều khiển theo mức thay vì chỉ bật/tắt (tốc độ quạt, độ mở van)',
}

export function GatewayPinFormDialog({
  gatewayId,
  open,
  onOpenChange,
}: {
  gatewayId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateGatewayPinMutation(gatewayId)
  const { data: metrics } = useMetricsQuery()
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateGatewayPinFormValues>({
    resolver: zodResolver(createGatewayPinSchema),
    defaultValues: DEFAULTS,
  })
  const type = watch('type')
  const direction = PIN_TYPE_DIRECTION[type]

  useEffect(() => {
    if (open) reset(DEFAULTS)
  }, [open, reset])

  function onSubmit(values: CreateGatewayPinFormValues) {
    createMutation.mutate(
      {
        direction: PIN_TYPE_DIRECTION[values.type],
        type: values.type,
        name: values.name,
        // Chỉ pin INPUT mới gắn metric — pin OUTPUT là relay, không sinh datastream.
        metricId:
          PIN_TYPE_DIRECTION[values.type] === 'INPUT' && values.metricId
            ? Number(values.metricId)
            : null,
        pinNumber: Number(values.pinNumber),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã thêm pin')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo pin thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm pin"
      submitLabel="Tạo pin"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="pin-name" data-required>Tên pin</FieldLabel>
        <Input
          id="pin-name"
          placeholder="Nhiệt độ chuồng A"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        <FieldError errors={[errors.name]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.type}>
          <FieldLabel htmlFor="pin-type" data-required>Loại pin</FieldLabel>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="pin-type"
                  aria-invalid={!!errors.type}
                  aria-describedby="pin-type-hint"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.type]} />
        </Field>

        <Field data-invalid={!!errors.pinNumber}>
          <FieldLabel htmlFor="pin-number" data-required>Số chân</FieldLabel>
          <Input
            id="pin-number"
            type="number"
            min={1}
            aria-invalid={!!errors.pinNumber}
            {...register('pinNumber')}
          />
          <FieldError errors={[errors.pinNumber]} />
        </Field>
      </div>

      {/* Chú thích trải hết bề ngang thay vì nằm trong ô nửa trái — câu giải thích dài, ép vào
          nửa lưới thì xuống ba dòng. Ra ngoài Field nên phải tự nối lại `aria-describedby`. */}
      <FieldDescription id="pin-type-hint" className="-mt-3">
        {TYPE_HINT[type]}
      </FieldDescription>

      {direction === 'INPUT' && (
        <Field data-invalid={!!errors.metricId}>
          <FieldLabel htmlFor="pin-metric" data-required>Đơn vị</FieldLabel>
          <Controller
            control={control}
            name="metricId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="pin-metric" aria-invalid={!!errors.metricId} className="w-full">
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {metrics?.map((metric) => (
                      <SelectItem key={metric.id} value={String(metric.id)}>
                        {metric.name} ({metric.unit})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.metricId]} />
        </Field>
      )}
    </FormDialog>
  )
}
