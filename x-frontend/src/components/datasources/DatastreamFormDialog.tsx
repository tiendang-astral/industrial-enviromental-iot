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
import { useCreateDatastreamForJobMutation } from '@/queries/useCreateDatastreamForJobMutation'
import type { ExternalSourceJob } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

export function DatastreamFormDialog({
  externalSourceId,
  job,
  metrics,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  job: ExternalSourceJob
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
    if (open) reset({ name: '', metricId: '', sourceField: '' })
  }, [open, reset])

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
          toast.success('Tạo datastream thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo datastream thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm datastream"
      description={`Gắn một cột dữ liệu của job "${job.name}" vào một metric để hiển thị lên dashboard.`}
      submitLabel="Tạo"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.sourceField}>
        <FieldLabel htmlFor="ds-field">Cột dữ liệu</FieldLabel>
        <Controller
          control={control}
          name="sourceField"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ds-field" aria-invalid={!!errors.sourceField} className="w-full">
                <SelectValue placeholder="Chọn cột" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {job.queryConfig.valueColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FieldDescription>Danh sách lấy từ cột dữ liệu đã khai báo trong job.</FieldDescription>
        <FieldError errors={[errors.sourceField]} />
      </Field>

      <Field data-invalid={!!errors.metricId}>
        <FieldLabel htmlFor="ds-metric">Metric</FieldLabel>
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
        <FieldLabel htmlFor="ds-name">Tên datastream</FieldLabel>
        <Input id="ds-name" aria-invalid={!!errors.name} {...register('name')} />
        <FieldDescription>Tên hiển thị trên widget dashboard.</FieldDescription>
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}
