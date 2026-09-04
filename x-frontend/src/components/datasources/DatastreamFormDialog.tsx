import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { formatDateTime } from '@/lib/datetime'
import { suggestMetricCode } from '@/lib/sqlTemplate'
import { cn } from '@/lib/utils'
import { useCreateDatastreamForJobMutation } from '@/queries/useCreateDatastreamForJobMutation'
import type { ExternalSourceJob, PreviewColumn, StartFrom } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

const START_FROM_OPTIONS: { value: StartFrom; label: string }[] = [
  { value: 'NEW_ONLY', label: 'chỉ dữ liệu mới từ giờ' },
  { value: 'ALL_HISTORY', label: 'toàn bộ lịch sử' },
  { value: 'FROM_DATE', label: 'từ ngày cụ thể' },
]

/**
 * Tên kênh unique theo (đơn vị, tên) ở DB. Hai job cùng tên trong một nguồn sẽ sinh ra cùng một
 * tên gợi ý, nên phải né sẵn — đưa người dùng một giá trị điền sẵn mà bấm Lưu là lỗi thì tệ hơn
 * là để trống.
 */
function uniqueName(base: string, taken: string[]): string {
  const lower = taken.map((name) => name.toLowerCase())
  if (!lower.includes(base.toLowerCase())) return base
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base} (${index})`
    if (!lower.includes(candidate.toLowerCase())) return candidate
  }
  return base
}

export function DatastreamFormDialog({
  externalSourceId,
  job,
  column,
  metrics,
  existingNames,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  job: ExternalSourceJob
  /** Cột kết quả đang gán — null khi dialog đóng. */
  column: PreviewColumn | null
  metrics: Metric[]
  /** Tên kênh đã dùng trong cùng đơn vị — để tên gợi ý không đâm vào uq_datastream_name. */
  existingNames: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateDatastreamForJobMutation(externalSourceId)
  const [startFrom, setStartFrom] = useState<StartFrom>('NEW_ONLY')
  const [startFromDate, setStartFromDate] = useState<Date | undefined>()
  // Job chưa chạy lần nào thì chưa bỏ lỡ gì — không hỏi mốc cho một lỗ hổng không tồn tại.
  const hasGap = !!job.lastRunAt
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
    const base = suggested ? `${suggested.name} · ${job.name}` : column.name
    reset({
      name: uniqueName(base, existingNames),
      metricId: suggested ? String(suggested.id) : '',
      sourceField: column.name,
    })
    setStartFrom('NEW_ONLY')
    setStartFromDate(undefined)
  }, [open, column, metrics, job.name, existingNames, reset])

  function onSubmit(values: CreateDatastreamFormValues) {
    createMutation.mutate(
      {
        jobId: job.id,
        payload: {
          name: values.name,
          metricId: Number(values.metricId),
          sourceField: values.sourceField,
          startFrom: hasGap ? startFrom : undefined,
          startFromDate: hasGap && startFrom === 'FROM_DATE' ? startFromDate?.toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã tạo kênh dữ liệu')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo kênh thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={column ? `Tạo kênh từ cột ${column.name}` : 'Tạo kênh dữ liệu'}
      submitLabel="Tạo kênh"
      isPending={createMutation.isPending}
      submitDisabled={hasGap && startFrom === 'FROM_DATE' && !startFromDate}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel htmlFor="ds-field">Cột dữ liệu</FieldLabel>
        <Input id="ds-field" readOnly className="font-mono" {...register('sourceField')} />
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
        <FieldError errors={[errors.name]} />
      </Field>

      {hasGap && (
        <Field>
          <FieldLabel>Đọc dữ liệu từ mốc</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {START_FROM_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={startFrom === option.value ? 'default' : 'outline'}
                onClick={() => setStartFrom(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {startFrom === 'FROM_DATE' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn('w-fit', !startFromDate && 'text-muted-foreground')}
                >
                  <CalendarDays data-icon="inline-start" />
                  {startFromDate ? formatDateTime(startFromDate.toISOString()) : 'Chọn ngày bắt đầu'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startFromDate} onSelect={setStartFromDate} />
              </PopoverContent>
            </Popover>
          )}
          <FieldDescription>
            Job đã chạy từ {formatDateTime(job.lastRunAt)} — dữ liệu trước mốc đó chưa được lưu.
          </FieldDescription>
        </Field>
      )}
    </FormDialog>
  )
}
