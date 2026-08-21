import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  externalSourceJobSchema,
  FILTER_OPERATORS,
  type ExternalSourceJobFormValues,
} from '@/lib/externalSourceJobSchema'
import { useCreateExternalSourceJobMutation } from '@/queries/useCreateExternalSourceJobMutation'
import { useUpdateExternalSourceJobMutation } from '@/queries/useUpdateExternalSourceJobMutation'
import type { ExternalSourceJob } from '@/types/externalSource'

const EMPTY_JOB: ExternalSourceJobFormValues = {
  name: '',
  table: '',
  timestampColumn: '',
  valueColumns: '',
  filters: [],
  scheduleCron: '*/5 * * * *',
}

export function JobFormDialog({
  externalSourceId,
  job,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  /** null = tạo mới. */
  job: ExternalSourceJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateExternalSourceJobMutation(externalSourceId)
  const updateMutation = useUpdateExternalSourceJobMutation(externalSourceId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ExternalSourceJobFormValues>({
    resolver: zodResolver(externalSourceJobSchema),
    defaultValues: EMPTY_JOB,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'filters' })

  useEffect(() => {
    if (!open) return
    reset(
      job
        ? {
            name: job.name,
            table: job.queryConfig.table,
            timestampColumn: job.queryConfig.timestampColumn,
            valueColumns: job.queryConfig.valueColumns.join(', '),
            filters: job.filterConfig ?? [],
            scheduleCron: job.scheduleCron,
          }
        : EMPTY_JOB
    )
  }, [open, job, reset])

  function onSubmit(values: ExternalSourceJobFormValues) {
    const payload = {
      name: values.name,
      queryConfig: {
        table: values.table,
        timestampColumn: values.timestampColumn,
        valueColumns: values.valueColumns
          .split(',')
          .map((column) => column.trim())
          .filter(Boolean),
      },
      filterConfig: values.filters,
      scheduleCron: values.scheduleCron,
    }

    const onSuccess = () => {
      onOpenChange(false)
      toast.success(job ? 'Cập nhật job thành công' : 'Tạo job thành công')
    }
    const onError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Lưu job thất bại'))

    if (job) {
      updateMutation.mutate({ id: job.id, payload }, { onSuccess, onError })
    } else {
      createMutation.mutate(payload, { onSuccess, onError })
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={job ? 'Sửa job' : 'Thêm job'}
      description="Job đọc dữ liệu mới từ một bảng theo lịch cron. Đổi bảng hoặc cột thời gian sẽ reset vị trí đọc, job đọc lại từ đầu."
      className="sm:max-w-2xl"
      isPending={isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="job-name">Tên job</FieldLabel>
        <Input id="job-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.table}>
          <FieldLabel htmlFor="job-table">Tên bảng</FieldLabel>
          <Input
            id="job-table"
            placeholder="readings"
            aria-invalid={!!errors.table}
            {...register('table')}
          />
          <FieldError errors={[errors.table]} />
        </Field>
        <Field data-invalid={!!errors.timestampColumn}>
          <FieldLabel htmlFor="job-timestamp">Cột thời gian</FieldLabel>
          <Input
            id="job-timestamp"
            placeholder="measured_at"
            aria-invalid={!!errors.timestampColumn}
            {...register('timestampColumn')}
          />
          <FieldError errors={[errors.timestampColumn]} />
        </Field>
      </div>

      <Field data-invalid={!!errors.valueColumns}>
        <FieldLabel htmlFor="job-columns">Cột dữ liệu</FieldLabel>
        <Input
          id="job-columns"
          placeholder="temperature_c, humidity_pct"
          aria-invalid={!!errors.valueColumns}
          {...register('valueColumns')}
        />
        <FieldDescription>
          Cách nhau bằng dấu phẩy. Mỗi cột ở đây là một field có thể gắn vào metric qua datastream.
        </FieldDescription>
        <FieldError errors={[errors.valueColumns]} />
      </Field>

      <Field data-invalid={!!errors.scheduleCron}>
        <FieldLabel htmlFor="job-cron">Lịch chạy (cron)</FieldLabel>
        <Input
          id="job-cron"
          placeholder="*/5 * * * *"
          className="tabular"
          aria-invalid={!!errors.scheduleCron}
          {...register('scheduleCron')}
        />
        <FieldDescription>Cron 5 trường. Ví dụ `*/5 * * * *` = chạy mỗi 5 phút.</FieldDescription>
        <FieldError errors={[errors.scheduleCron]} />
      </Field>

      <FieldSet>
        <div className="flex items-center justify-between gap-2">
          <FieldLegend variant="label" className="mb-0">
            Bộ lọc (tùy chọn)
          </FieldLegend>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ column: '', operator: '=', value: '' })}
          >
            <Plus data-icon="inline-start" />
            Thêm điều kiện
          </Button>
        </div>

        {fields.length === 0 ? (
          <FieldDescription>
            Không có điều kiện nào — job đọc toàn bộ dòng mới của bảng.
          </FieldDescription>
        ) : (
          fields.map((filter, index) => (
            <div key={filter.id} className="flex items-start gap-2">
              <Input
                aria-label={`Cột điều kiện ${index + 1}`}
                placeholder="cột"
                aria-invalid={!!errors.filters?.[index]?.column}
                {...register(`filters.${index}.column`)}
              />
              <Controller
                control={control}
                name={`filters.${index}.operator`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-24 shrink-0" aria-label={`Toán tử ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {FILTER_OPERATORS.map((operator) => (
                          <SelectItem key={operator} value={operator}>
                            {operator}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                aria-label={`Giá trị điều kiện ${index + 1}`}
                placeholder="giá trị"
                aria-invalid={!!errors.filters?.[index]?.value}
                {...register(`filters.${index}.value`)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <X />
                    <span className="sr-only">Xóa điều kiện {index + 1}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa điều kiện</TooltipContent>
              </Tooltip>
            </div>
          ))
        )}
      </FieldSet>
    </FormDialog>
  )
}
