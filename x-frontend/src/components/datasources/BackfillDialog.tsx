import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { useCreateBackfillMutation } from '@/queries/useCreateBackfillMutation'
import { useEstimateBackfillMutation } from '@/queries/useEstimateBackfillMutation'
import type { BackfillRequest, StartFrom } from '@/types/externalSource'
import type { Datastream } from '@/types/dashboard'

const START_FROM_OPTIONS: { value: Exclude<StartFrom, 'NEW_ONLY'>; label: string }[] = [
  { value: 'ALL_HISTORY', label: 'toàn bộ lịch sử' },
  { value: 'FROM_DATE', label: 'từ ngày cụ thể' },
]

function formatSpan(from: string, to: string) {
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
  if (days < 1) return 'dưới một ngày'
  if (days < 60) return `${days} ngày`
  const months = Math.round(days / 30)
  return months < 24 ? `${months} tháng` : `${Math.round(days / 365)} năm`
}

/**
 * Đọc lại phần lịch sử kênh chưa có. Chạy bằng đúng câu SQL của job, chỉ đổi giá trị bind vào
 * :cursor — vì vậy phải nói rõ là công thức SELECT hiện tại sẽ áp lên cả dữ liệu cũ.
 */
export function BackfillDialog({
  datastream,
  externalSourceId,
  open,
  onOpenChange,
}: {
  datastream: Datastream
  externalSourceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [startFrom, setStartFrom] = useState<Exclude<StartFrom, 'NEW_ONLY'>>('ALL_HISTORY')
  const [startFromDate, setStartFromDate] = useState<Date | undefined>()
  const [error, setError] = useState<string | null>(null)

  const estimateMutation = useEstimateBackfillMutation(datastream.id)
  const createMutation = useCreateBackfillMutation(datastream.id, externalSourceId)
  const estimate = estimateMutation.data ?? null

  const payload: BackfillRequest = {
    startFrom,
    startFromDate: startFromDate?.toISOString(),
  }
  const ready = startFrom !== 'FROM_DATE' || !!startFromDate

  useEffect(() => {
    if (!open) return
    setStartFrom('ALL_HISTORY')
    setStartFromDate(undefined)
    setError(null)
    estimateMutation.reset()
    // Chỉ chạy lại khi dialog mở/đóng — thêm mutation vào deps sẽ ước lượng lặp vô hạn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, datastream.id])

  // Ước lượng ngay khi mốc đủ xác định: người dùng thấy khối lượng trước khi bấm, không phải sau.
  useEffect(() => {
    if (!open || !ready) return
    estimateMutation.mutate(payload, {
      onError: (err) => setError(getApiErrorMessage(err, 'Không ước lượng được khối lượng')),
      onSuccess: () => setError(null),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startFrom, startFromDate?.getTime()])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startFrom === 'FROM_DATE' && !startFromDate) {
      setError('Chọn ngày bắt đầu đọc lại')
      return
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('Đã xếp lượt đọc lại — dữ liệu sẽ lùi dần về mốc đã chọn')
      },
      onError: (err) => setError(getApiErrorMessage(err, 'Không xếp được lượt đọc lại')),
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Đọc lại lịch sử cho “${datastream.name}”`}
      description="Hệ thống chạy lại đúng câu truy vấn của job trên khoảng thời gian còn thiếu, đọc từ mới về cũ."
      submitLabel="Bắt đầu đọc lại"
      isPending={createMutation.isPending}
      submitDisabled={!ready}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel>Đọc lại từ</FieldLabel>
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
          {datastream.oldestReadingAt
            ? `Kênh đang có số đo từ ${formatDateTime(datastream.oldestReadingAt)} trở đi.`
            : 'Kênh chưa ghi nhận mốc dữ liệu nào.'}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Khối lượng phải đọc</FieldLabel>
        {estimateMutation.isPending && <Skeleton className="h-10 w-full rounded-md" />}
        {!estimateMutation.isPending && estimate && (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <p className="tabular text-lg font-semibold tracking-tight">
              {estimate.rowCount !== null
                ? `${estimate.rowCount.toLocaleString('vi-VN')} dòng`
                : 'Chưa đếm được'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {formatSpan(estimate.targetFrom, estimate.coveredFrom)} dữ liệu, tính tới{' '}
              {formatDateTime(estimate.coveredFrom)}
              {estimate.rowCount === null && ' — phép đếm chạy quá lâu và đã dừng, lượt đọc lại vẫn chạy được'}
            </p>
          </div>
        )}
        {!estimateMutation.isPending && !estimate && !error && (
          <FieldDescription>Chọn mốc để xem cần đọc bao nhiêu dòng.</FieldDescription>
        )}
        <FieldError errors={error ? [{ message: error }] : undefined} />
      </Field>

      <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-[12.5px] text-muted-foreground">
          Dữ liệu cũ sẽ được tính theo <span className="font-medium text-foreground">câu truy vấn hiện tại</span> của
          job. Nếu bạn đã sửa công thức trong SELECT kể từ đó, phần đọc lại sẽ theo công thức mới.
        </p>
      </div>
    </FormDialog>
  )
}
