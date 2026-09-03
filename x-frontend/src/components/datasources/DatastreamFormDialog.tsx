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
  createDatastreamSchema,
  type CreateDatastreamFormValues,
} from '@/lib/externalSourceJobSchema'
import { suggestMetricCode } from '@/lib/sqlTemplate'
import { useCreateDatastreamForJobMutation } from '@/queries/useCreateDatastreamForJobMutation'
import type { ExternalSourceJob, PreviewColumn } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

export function DatastreamFormDialog({
  externalSourceId,
  job,
  column,
  metrics,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  job: ExternalSourceJob
  /** Cột kết quả đang gán — null khi dialog đóng. */
  column: PreviewColumn | null
  metrics: Metric[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateDatastreamForJobMutation(externalSourceId)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateDatastreamFormValues>({
    resolver: zodResolver(createDatastreamSchema),
    defaultValues: { name: '', metricId: '', sourceField: '' },
  })

  useEffect(() => {
    if (!open || !column) return
    // Điền sẵn theo gợi ý từ tên cột — người dùng chỉ phải sửa khi đoán sai.
    const suggestedCode = suggestMetricCode(column.name)
    const suggested = suggestedCode ? metrics.find((metric) => metric.code === suggestedCode) : null
    reset({
      name: suggested ? `${suggested.name} · ${job.name}` : column.name,
      metricId: suggested ? String(suggested.id) : '',
      sourceField: column.name,
    })
  }, [open, column, metrics, job.name, reset])

  function onSubmit(values: CreateDatastreamFormValues) {
    createMutation.mutate(
      {
        jobId: job.id,
        payload: {
          name: values.name,
          metricId: Number(values.metricId),
          sourceField: values.sourceField,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã gán kênh dữ liệu')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Gán kênh thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gán cột vào metric"
      description={
        column
          ? `Cột "${column.name}" của job "${job.name}" trở thành một kênh dữ liệu dùng được trên dashboard.`
          : undefined
      }
      submitLabel="Gán kênh"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel htmlFor="ds-field">Cột dữ liệu</FieldLabel>
        <Input id="ds-field" readOnly className="font-mono" {...register('sourceField')} />
        <FieldDescription>Lấy từ kết quả chạy thử của job, không sửa ở đây.</FieldDescription>
      </Field>

      <Field data-invalid={!!errors.metricId}>
        <FieldLabel htmlFor="ds-metric" data-required>
          Metric
        </FieldLabel>
        <Controller
          control={control}
          name="metricId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ds-metric" aria-invalid={!!errors.metricId} className="w-full">
                <SelectValue placeholder="Chọn metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {metrics.map((metric) => (
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

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="ds-name" data-required>
          Tên kênh
        </FieldLabel>
        <Input id="ds-name" aria-invalid={!!errors.name} {...register('name')} />
        <FieldDescription>Tên hiển thị trên widget dashboard.</FieldDescription>
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}
