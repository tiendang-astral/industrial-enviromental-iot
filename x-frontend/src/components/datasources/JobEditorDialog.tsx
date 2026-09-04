import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Clock, Play, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { CursorExplainer } from '@/components/datasources/CursorExplainer'
import { PreviewTable } from '@/components/datasources/PreviewTable'
import { SchemaTree } from '@/components/datasources/SchemaTree'
import { SqlEditor } from '@/components/datasources/SqlEditor'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { CURSOR_TOKEN, externalSourceJobSchema } from '@/lib/externalSourceJobSchema'
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

const SQL_PLACEHOLDER = '-- Chọn một bảng ở bên trái để bắt đầu'

/** Nhãn cột trái cho khối cài đặt — gọn hơn FieldLabel xếp trên mỗi ô một hàng. */
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-20 shrink-0 text-[12.5px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

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

  // Giá trị :cursor sẽ mang ở lần chạy tới. Job đang sửa có mốc thật; job mới thì do "Đọc từ"
  // quyết định — nên dòng này cũng làm rõ luôn ba lựa chọn đó nghĩa là gì.
  const nextCursorValue = job
    ? job.incrementalCursor
      ? formatDateTime(job.incrementalCursor)
      : 'đầu (01/01/1970)'
    : startFrom === 'ALL_HISTORY'
      ? 'đầu (01/01/1970)'
      : startFrom === 'FROM_DATE'
        ? startFromDate
          ? formatDateTime(startFromDate.toISOString())
          : 'chưa chọn ngày'
        : 'thời điểm lưu job'

  // Chỉ lên tiếng khi câu SQL thực sự sai, và nói luôn phải sửa thế nào. Câu đúng thì im lặng —
  // một dấu tích thường trực chẳng dạy được gì cho người chưa biết luật.
  const sqlHint = !sql.trim()
    ? null
    : !/^\s*(select|with)\b/i.test(sql)
      ? 'Câu truy vấn phải bắt đầu bằng SELECT hoặc WITH.'
      : sql.replace(/;\s*$/, '').includes(';')
        ? 'Chỉ chạy được một câu lệnh — bỏ dấu ; ở giữa câu.'
        : !new RegExp(`${CURSOR_TOKEN}\\b`).test(sql)
          ? `Thiếu ${CURSOR_TOKEN} — thêm vào điều kiện thời gian để mỗi lần chạy chỉ đọc dòng mới, ví dụ: WHERE measured_at > ${CURSOR_TOKEN}`
          : null

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
    // Job đang sửa đã có SQL — chạy thử luôn để bảng kết quả (và ô chọn cột thời gian nằm trong
    // đó) có mặt ngay, khỏi bắt người dùng bấm một phát chỉ để thấy thứ vốn đã cấu hình xong.
    if (job) runPreview(job.queryConfig.sql, job.queryConfig.timestampColumn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        </DialogHeader>

        {/* Bảng kết quả chốt 5 dòng nên nội dung cao có giới hạn — để chính khối này cuộn, khỏi
            lồng thêm vùng cuộn nào bên trong. */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* Cây bảng vẫn tự cuộn: database khách hàng có thể hàng trăm bảng, thả tự do sẽ kéo modal dài vô tận. */}
          <div className="min-h-0 lg:max-h-[26rem] lg:border-r lg:border-border lg:pr-4">
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
            <Field data-invalid={!!errors.sql}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="job-sql">Câu truy vấn</FieldLabel>
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
                placeholder={SQL_PLACEHOLDER}
              />
              {sqlHint ? (
                <p className="flex items-start gap-1.5 text-[12.5px] text-destructive">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{sqlHint}</span>
                </p>
              ) : sql.trim() ? (
                <CursorExplainer nextValue={nextCursorValue} />
              ) : (
                <FieldError errors={errors.sql ? [{ message: errors.sql }] : undefined} />
              )}
            </Field>

            <PreviewTable
              result={preview}
              isPending={previewMutation.isPending}
              error={previewError}
              timestampColumn={timestampColumn}
              headerAction={
                // Nằm trên thanh tiêu đề bảng: luôn nhìn thấy dù kết quả dài bao nhiêu, và vẫn
                // kề ngay các cột vừa hiện ra để quan hệ "chọn một trong số này" tự nói.
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cột thời gian</span>
                  <Select value={timestampColumn} onValueChange={setTimestampColumn}>
                    <SelectTrigger
                      id="job-ts"
                      size="sm"
                      className="h-7 w-56 font-mono text-xs"
                      aria-invalid={!!errors.timestampColumn}
                      aria-label="Cột thời gian"
                    >
                      <SelectValue placeholder="Chọn cột" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(preview?.columns ?? []).map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            <span className="flex items-center gap-2">
                              {/^timestamp|^date/i.test(column.dataType) && (
                                <Clock className="size-3.5 text-primary" />
                              )}
                              <span className="font-mono">{column.name}</span>
                              <span className="text-[11px] text-muted-foreground">{column.dataType}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <SettingRow label="Tên job">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Tên job"
              aria-invalid={!!errors.name}
              className="h-8 max-w-80"
            />
            {errors.name && <span className="text-[12.5px] text-destructive">{errors.name}</span>}
          </SettingRow>
          <SettingRow label="Chạy">
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
            <Input
              value={scheduleCron}
              onChange={(event) => setScheduleCron(event.target.value)}
              className="tabular h-8 w-36 font-mono"
              aria-label="Lịch chạy dạng cron"
            />
          </SettingRow>

          {!job && (
            <SettingRow label="Đọc từ">
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
              {startFrom === 'FROM_DATE' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(!startFromDate && 'text-muted-foreground')}
                    >
                      <CalendarDays data-icon="inline-start" />
                      {startFromDate ? formatDateTime(startFromDate.toISOString()) : 'Chọn ngày'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startFromDate} onSelect={setStartFromDate} />
                  </PopoverContent>
                </Popover>
              )}
              {errors.startFromDate && (
                <span className="text-[12.5px] text-destructive">{errors.startFromDate}</span>
              )}
            </SettingRow>
          )}

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
