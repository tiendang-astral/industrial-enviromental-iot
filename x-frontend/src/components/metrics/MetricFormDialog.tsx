import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { MetricColorPicker } from '@/components/metrics/MetricColorPicker'
import { getApiErrorMessage } from '@/lib/apiError'
import { metricSchema, type MetricFormValues } from '@/lib/metricSchema'
import {
  useCreateMetricMutation,
  useResetMetricThresholdMutation,
  useSetMetricThresholdMutation,
  useUpdateMetricMutation,
} from '@/queries/useMetricMutations'
import type { Metric, MetricColor } from '@/types/metric'

const EMPTY: MetricFormValues = {
  code: '',
  name: '',
  unit: '',
  color: 'chart-1',
  minValue: '',
  maxValue: '',
}

/**
 * Một dialog cho cả hai loại. Chỉ số hệ thống dùng chung mọi tenant nên định nghĩa của nó chỉ đọc,
 * chỉ mở phần ngưỡng — người dùng không phải học hai màn hình cho cùng một việc.
 */
export function MetricFormDialog({
  open,
  metric,
  onOpenChange,
}: {
  open: boolean
  /** null = tạo chỉ số mới. */
  metric: Metric | null
  onOpenChange: (open: boolean) => void
}) {
  const isSystem = !!metric && !metric.custom
  const isEdit = !!metric

  const [color, setColor] = useState<MetricColor>('chart-1')

  const createMutation = useCreateMetricMutation()
  const updateMutation = useUpdateMetricMutation()
  const thresholdMutation = useSetMetricThresholdMutation()
  const resetThresholdMutation = useResetMetricThresholdMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema(isSystem)),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    if (metric) {
      reset({
        code: metric.code,
        name: metric.name,
        unit: metric.unit,
        color: metric.color ?? 'chart-1',
        minValue: metric.minValue?.toString() ?? '',
        maxValue: metric.maxValue?.toString() ?? '',
      })
      setColor(metric.color ?? 'chart-1')
    } else {
      reset(EMPTY)
      setColor('chart-1')
    }
  }, [open, metric, reset])

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    thresholdMutation.isPending ||
    resetThresholdMutation.isPending

  /**
   * Ngưỡng nằm ở bảng riêng nên "xoá trắng hai ô" là DELETE chứ không phải PUT giá trị rỗng —
   * cùng một thao tác trên form, hai endpoint khác nhau.
   */
  async function saveThreshold(id: number, values: MetricFormValues) {
    if (values.minValue === '' && values.maxValue === '') {
      if (metric?.thresholdOverridden) await resetThresholdMutation.mutateAsync(id)
      return
    }
    await thresholdMutation.mutateAsync({
      id,
      payload: { minValue: Number(values.minValue), maxValue: Number(values.maxValue) },
    })
  }

  async function submit(values: MetricFormValues) {
    try {
      if (!isEdit) {
        const created = await createMutation.mutateAsync({
          code: values.code!.trim(),
          name: values.name!.trim(),
          unit: values.unit!.trim(),
          color,
          minValue: values.minValue === '' ? null : Number(values.minValue),
          maxValue: values.maxValue === '' ? null : Number(values.maxValue),
        })
        toast.success(`Đã thêm chỉ số ${created.name}`)
      } else {
        if (metric!.custom) {
          await updateMutation.mutateAsync({
            id: metric!.id,
            payload: { name: values.name!.trim(), unit: values.unit!.trim(), color },
          })
        }
        await saveThreshold(metric!.id, values)
        toast.success('Đã lưu thay đổi')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lưu chỉ số thất bại'))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Chỉ số ${metric!.name}` : 'Thêm chỉ số'}
      description={
          'Chỉ số là đại lượng đo lường, ví dụ nhiệt độ hay độ ẩm.'
      }
      isPending={isPending}
      onSubmit={handleSubmit(submit)}
    >
      <Field data-invalid={!!errors.code || undefined}>
        <FieldLabel htmlFor="metric-code" data-required={!isSystem || undefined}>
          Mã chỉ số
        </FieldLabel>
        <Input
          id="metric-code"
          disabled={isEdit}
          aria-invalid={!!errors.code}
          placeholder="VD: chi_so_nhiet_do_chuong"
          {...register('code')}
        />
        {errors.code && <FieldError>{errors.code.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.name || undefined}>
        <FieldLabel htmlFor="metric-name" data-required={!isSystem || undefined}>
          Tên hiển thị
        </FieldLabel>
        <Input
          id="metric-name"
          disabled={isSystem}
          aria-invalid={!!errors.name}
          placeholder="VD: Nhiệt độ chuồng"
          {...register('name')}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.unit || undefined}>
        <FieldLabel htmlFor="metric-unit" data-required={!isSystem || undefined}>
          Đơn vị
        </FieldLabel>
        <Input
          id="metric-unit"
          disabled={isSystem}
          aria-invalid={!!errors.unit}
          placeholder="VD: °C"
          {...register('unit')}
        />
        {errors.unit && <FieldError>{errors.unit.message}</FieldError>}
      </Field>

      {!isSystem && (
        <Field>
          <FieldLabel data-required>Màu</FieldLabel>
          <MetricColorPicker value={color} onChange={setColor} />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.minValue || undefined}>
          <FieldLabel htmlFor="metric-min">Ngưỡng dưới</FieldLabel>
          <Input
            id="metric-min"
            type="number"
            step="any"
            aria-invalid={!!errors.minValue}
            placeholder="VD: 20"
            {...register('minValue')}
          />
          {errors.minValue && <FieldError>{errors.minValue.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.maxValue || undefined}>
          <FieldLabel htmlFor="metric-max">Ngưỡng trên</FieldLabel>
          <Input
            id="metric-max"
            type="number"
            step="any"
            aria-invalid={!!errors.maxValue}
            placeholder="VD: 28"
            {...register('maxValue')}
          />
          {errors.maxValue && <FieldError>{errors.maxValue.message}</FieldError>}
        </Field>
      </div>
    </FormDialog>
  )
}
