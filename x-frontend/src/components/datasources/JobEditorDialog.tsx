import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { PreviewTable } from '@/components/datasources/PreviewTable'
import { SchemaTree } from '@/components/datasources/SchemaTree'
import { SqlEditor } from '@/components/datasources/SqlEditor'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { externalSourceJobSchema } from '@/lib/externalSourceJobSchema'
import { buildStarterSql, CRON_PRESETS } from '@/lib/sqlTemplate'
import { cn } from '@/lib/utils'
import { useCreateExternalSourceJobMutation } from '@/queries/useCreateExternalSourceJobMutation'
import { useExternalSourceSchemaQuery } from '@/queries/useExternalSourceSchemaQuery'
import { usePreviewQueryMutation } from '@/queries/usePreviewQueryMutation'
import { useUpdateExternalSourceJobMutation } from '@/queries/useUpdateExternalSourceJobMutation'
import type { ExternalSourceJob, PreviewResult, SchemaTable, StartFrom } from '@/types/externalSource'

const START_FROM_OPTIONS: { value: StartFrom; label: string }[] = [
  { value: 'NEW_ONLY', label: 'chỉ dữ liệu mới từ giờ' },
  { value: 'ALL_HISTORY', label: 'toàn bộ lịch sử' },
  { value: 'FROM_DATE', label: 'từ ngày cụ thể' },
]

export function JobEditorDialog({
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
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [timestampColumn, setTimestampColumn] = useState('')
  const [scheduleCron, setScheduleCron] = useState('*/5 * * * *')
  const [startFrom, setStartFrom] = useState<StartFrom>('NEW_ONLY')
  const [startFromDate, setStartFromDate] = useState<Date | undefined>()
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sqlRef = useRef<HTMLTextAreaElement>(null)

  const { data: tables, isLoading: schemaLoading, error: schemaError } = useExternalSourceSchemaQuery(
    externalSourceId,
    open
  )
  const previewMutation = usePreviewQueryMutation(externalSourceId)
  const createMutation = useCreateExternalSourceJobMutation(externalSourceId)
  const updateMutation = useUpdateExternalSourceJobMutation(externalSourceId)
  const isSaving = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!open) return
    setName(job?.name ?? '')
    setSql(job?.queryConfig.sql ?? '')
    setTimestampColumn(job?.queryConfig.timestampColumn ?? '')
    setScheduleCron(job?.scheduleCron ?? '*/5 * * * *')
    setStartFrom('NEW_ONLY')
    setStartFromDate(undefined)
    setActiveTable(null)
    setPreview(null)
    setPreviewError(null)
    setErrors({})
  }, [open, job])

  function handleSelectTable(table: SchemaTable) {
    setActiveTable(`${table.schema}.${table.name}`)
    // Chỉ tự sinh khi ô còn trống — không đạp lên câu người dùng đang viết dở.
    if (sql.trim()) return

    const starter = buildStarterSql(table)
    if (!starter) {
      toast.error(`Bảng ${table.name} không có cột thời gian nào để làm mốc đọc`)
      return
    }
    setName((current) => current || table.name)
    setSql(starter.sql)
    setTimestampColumn(starter.timestampColumn)
    runPreview(starter.sql, starter.timestampColumn)
  }

  function handleInsertColumn(columnName: string) {
    const textarea = sqlRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    setSql(sql.slice(0, start) + columnName + sql.slice(end))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + columnName.length, start + columnName.length)
    })
  }

  function runPreview(sqlToRun = sql, columnToUse = timestampColumn) {
    const parsed = externalSourceJobSchema.safeParse({
      name: name || 'tam',
      sql: sqlToRun,
      timestampColumn: columnToUse || 'tam',
      scheduleCron,
    })
    const sqlIssue = parsed.success ? null : parsed.error.issues.find((issue) => issue.path[0] === 'sql')
    if (sqlIssue) {
      setErrors((current) => ({ ...current, sql: sqlIssue.message }))
      return
    }
    setErrors((current) => ({ ...current, sql: '' }))

    previewMutation.mutate(
      { sql: sqlToRun, timestampColumn: columnToUse },
      {
        onSuccess: (result) => {
          setPreview(result)
          setPreviewError(null)
          // Đoán cột thời gian khi người dùng chưa chọn: cột đầu tiên thường là mốc.
          if (!columnToUse && result.columns.length > 0) {
            setTimestampColumn(result.columns[0].name)
          }
        },
        onError: (error) => {
          setPreview(null)
          setPreviewError(getApiErrorMessage(error, 'Không chạy được truy vấn'))
        },
      }
    )
  }

  function handleSubmit() {
    const parsed = externalSourceJobSchema.safeParse({ name, sql, timestampColumn, scheduleCron })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message
      })
      setErrors(next)
      return
    }
    if (!preview) {
      setErrors({ sql: 'Chạy thử thành công một lần trước khi lưu' })
      return
    }
    if (startFrom === 'FROM_DATE' && !startFromDate) {
      setErrors({ startFromDate: 'Chọn ngày bắt đầu đọc' })
      return
    }
    setErrors({})

    const queryConfig = { sql, timestampColumn }
    const onSuccess = () => {
      onOpenChange(false)
      toast.success(job ? 'Đã cập nhật job' : 'Đã tạo job và xếp lịch chạy')
    }
    const onError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Lưu job thất bại'))

    if (job) {
      updateMutation.mutate({ id: job.id, payload: { name, queryConfig, scheduleCron } }, { onSuccess, onError })
    } else {
      createMutation.mutate(
        { name, queryConfig, scheduleCron, startFrom, startFromDate: startFromDate?.toISOString() },
        { onSuccess, onError }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{job ? `Sửa job “${job.name}”` : 'Job đồng bộ mới'}</DialogTitle>
          <DialogDescription>
            Viết câu SELECT lấy dữ liệu cần theo dõi. Điều kiện lọc nằm trong WHERE, đổi đơn vị hay gộp nằm trong
            SELECT. Bắt buộc có <span className="font-mono">:cursor</span> để hệ thống chỉ đọc dòng mới.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[236px_minmax(0,1fr)]">
          <div className="min-h-0 lg:border-r lg:border-border lg:pr-4">
            {schemaError ? (
              <p className="text-sm text-muted-foreground">
                Không đọc được cấu trúc database. Kiểm tra lại kết nối của nguồn này.
              </p>
            ) : (
              <SchemaTree
                tables={tables ?? []}
                isLoading={schemaLoading}
                activeTable={activeTable}
                onSelectTable={handleSelectTable}
                onInsertColumn={handleInsertColumn}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="job-name" data-required>
                  Tên job
                </FieldLabel>
                <Input
                  id="job-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={!!errors.name}
                />
                <FieldError errors={errors.name ? [{ message: errors.name }] : undefined} />
              </Field>

              <Field data-invalid={!!errors.timestampColumn}>
                <FieldLabel htmlFor="job-ts" data-required>
                  Cột thời gian trong kết quả
                </FieldLabel>
                <Input
                  id="job-ts"
                  value={timestampColumn}
                  onChange={(event) => setTimestampColumn(event.target.value)}
                  placeholder="measured_at"
                  className="font-mono"
                  aria-invalid={!!errors.timestampColumn}
                />
                <FieldDescription>Dùng để lấy mốc thời gian và tính vị trí đọc tiếp theo.</FieldDescription>
                <FieldError errors={errors.timestampColumn ? [{ message: errors.timestampColumn }] : undefined} />
              </Field>
            </div>

            <Field data-invalid={!!errors.sql}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="job-sql" data-required>
                  Câu truy vấn
                </FieldLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => runPreview()}
                  disabled={previewMutation.isPending}
                >
                  <Play data-icon="inline-start" />
                  Chạy thử
                </Button>
              </div>
              <SqlEditor
                id="job-sql"
                ref={sqlRef}
                value={sql}
                onChange={setSql}
                onRun={() => runPreview()}
                invalid={!!errors.sql}
                rows={10}
              />
              <FieldDescription>
                Bấm tên bảng bên trái để hệ thống viết sẵn câu đầu tiên. Ctrl/⌘ + Enter để chạy thử.
              </FieldDescription>
              <FieldError errors={errors.sql ? [{ message: errors.sql }] : undefined} />
            </Field>

            <PreviewTable
              result={preview}
              isPending={previewMutation.isPending}
              error={previewError}
              timestampColumn={timestampColumn}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Đọc dữ liệu mới</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {CRON_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      size="sm"
                      variant={scheduleCron === preset.value ? 'default' : 'outline'}
                      onClick={() => setScheduleCron(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Input
                  value={scheduleCron}
                  onChange={(event) => setScheduleCron(event.target.value)}
                  className="tabular font-mono"
                  aria-label="Lịch chạy dạng cron"
                />
                <FieldError errors={errors.scheduleCron ? [{ message: errors.scheduleCron }] : undefined} />
              </Field>

              {!job && (
                <Field data-invalid={!!errors.startFromDate}>
                  <FieldLabel>Đọc từ mốc</FieldLabel>
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
                        <Button variant="outline" className={cn('w-fit', !startFromDate && 'text-muted-foreground')}>
                          {startFromDate ? formatDateTime(startFromDate.toISOString()) : 'Chọn ngày bắt đầu'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startFromDate} onSelect={setStartFromDate} />
                      </PopoverContent>
                    </Popover>
                  )}
                  <FieldDescription>
                    “Toàn bộ lịch sử” trên bảng lớn có thể mất vài lần chạy để đuổi kịp.
                  </FieldDescription>
                  <FieldError errors={errors.startFromDate ? [{ message: errors.startFromDate }] : undefined} />
                </Field>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <LoadingButton isPending={isSaving} onClick={handleSubmit} disabled={!preview}>
            {job ? 'Lưu job' : 'Lưu & chạy ngay'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
