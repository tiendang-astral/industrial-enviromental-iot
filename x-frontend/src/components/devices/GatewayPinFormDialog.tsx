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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  createGatewayPinSchema,
  DIRECTION_TYPES,
  type CreateGatewayPinFormValues,
} from '@/lib/gatewayPinSchema'
import { useCreateGatewayPinMutation } from '@/queries/useCreateGatewayPinMutation'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { PinDirection } from '@/types/gatewayPin'

const DEFAULTS: CreateGatewayPinFormValues = {
  direction: 'INPUT',
  type: 'AI',
  name: '',
  metricId: '',
  pinNumber: '1',
}

const TYPE_HINT: Record<string, string> = {
  AI: 'Analog In — đọc giá trị liên tục (nhiệt độ, độ ẩm)',
  DI: 'Digital In — đọc trạng thái bật/tắt (cảm biến cửa, báo mức)',
  DO: 'Digital Out — điều khiển relay bật/tắt',
  AO: 'Analog Out — xuất mức điều khiển liên tục',
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
    setValue,
    formState: { errors },
  } = useForm<CreateGatewayPinFormValues>({
    resolver: zodResolver(createGatewayPinSchema),
    defaultValues: DEFAULTS,
  })
  const direction = watch('direction') as PinDirection
  const type = watch('type')

  useEffect(() => {
    if (open) reset(DEFAULTS)
  }, [open, reset])

  function onSubmit(values: CreateGatewayPinFormValues) {
    createMutation.mutate(
      {
        direction: values.direction,
        type: values.type,
        name: values.name,
        // Chỉ pin INPUT mới gắn metric — pin OUTPUT là relay, không sinh datastream.
        metricId: values.direction === 'INPUT' && values.metricId ? Number(values.metricId) : null,
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
      description="Pin INPUT đọc dữ liệu về và tự sinh datastream. Pin OUTPUT dùng để điều khiển relay."
      submitLabel="Tạo pin"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel htmlFor="pin-direction" data-required>Chiều tín hiệu</FieldLabel>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <ToggleGroup
              id="pin-direction"
              type="single"
              variant="outline"
              className="w-full"
              value={field.value}
              onValueChange={(value) => {
                if (!value) return
                const next = value as PinDirection
                field.onChange(next)
                setValue('type', DIRECTION_TYPES[next][0])
              }}
            >
              <ToggleGroupItem value="INPUT" className="flex-1">
                INPUT (đọc)
              </ToggleGroupItem>
              <ToggleGroupItem value="OUTPUT" className="flex-1">
                OUTPUT (điều khiển)
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.type}>
          <FieldLabel htmlFor="pin-type" data-required>Loại pin</FieldLabel>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="pin-type" aria-invalid={!!errors.type} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DIRECTION_TYPES[direction].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>{TYPE_HINT[type]}</FieldDescription>
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

      {direction === 'INPUT' && (
        <Field data-invalid={!!errors.metricId}>
          <FieldLabel htmlFor="pin-metric" data-required>Metric</FieldLabel>
          <Controller
            control={control}
            name="metricId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="pin-metric" aria-invalid={!!errors.metricId} className="w-full">
                  <SelectValue placeholder="Chọn metric" />
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
          <FieldDescription>
            Metric quyết định đơn vị và ngưỡng cảnh báo của dữ liệu đọc từ chân này.
          </FieldDescription>
          <FieldError errors={[errors.metricId]} />
        </Field>
      )}
    </FormDialog>
  )
}
