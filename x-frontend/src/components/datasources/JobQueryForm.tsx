import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Clock, Play, Save, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import type {
  ExternalSourceJob,
  PreviewColumn,
  PreviewResult,
  SchemaTable,
  StartFrom,
} from '@/types/externalSource'

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

/**
 * Phần soạn truy vấn: cây bảng, câu SQL, chạy thử, lịch chạy. Tách khỏi dialog vì có hai nơi
 * dùng nó — bước 1 của luồng tạo mới, và tab "Sửa truy vấn" trong modal chi tiết. Trước đây sửa
 * truy vấn phải mở một dialog đè lên dialog đang mở.
 */
export function JobQueryForm({
  externalSourceId,
  job,
  submitLabel,
  onCancel,
  onSaved,
}: {
  externalSourceId: number
  /** null = tạo mới. */
  job: ExternalSourceJob | null
  submitLabel: string
  /** Bỏ trống thì không hiện nút Hủy — dùng khi form nằm trong tab, không phải trong dialog. */
  onCancel?: () => void
  onSaved: (job: ExternalSourceJob, columns: PreviewColumn[]) => void
}) {
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [timestampColumn, setTimestampColumn] = useState('')
  const [scheduleCron, setScheduleCron] = useState('*/5 * * * *')
  const [startFrom, setStartFrom] = useState<StartFrom>('NEW_ONLY')
  const [startFromDate, setStartFromDate] = useState<Date | undefined>()
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  // Câu SQL đã sinh ra bảng kết quả đang hiển thị. Sửa câu là mất hiệu lực, phải chạy lại —
  // nếu không thì người dùng lưu được một câu chưa bao giờ chạy qua.
  const [previewedSql, setPreviewedSql] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sqlRef = useRef<HTMLTextAreaElement>(null)

  const {
    data: tables,
    isLoading: schemaLoading,
    error: schemaError,
  } = useExternalSourceSchemaQuery(externalSourceId, true)
  const previewMutation = usePreviewQueryMutation(externalSourceId)
  const createMutation = useCreateExternalSourceJobMutation(externalSourceId)
  const updateMutation = useUpdateExternalSourceJobMutation(externalSourceId)
  const isSaving = createMutation.isPending || updateMutation.isPending

  const isPreviewCurrent = !!preview && previewedSql === sql

  // Giá trị :cursor sẽ mang ở lần chạy tới. Truy vấn đang sửa có mốc thật; truy vấn mới thì do
  // "Bắt đầu đọc từ" quyết định — nên dòng này cũng làm rõ luôn ba lựa chọn đó nghĩa là gì.
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
        : 'thời điểm lưu truy vấn'

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
    setName(job?.name ?? '')
    setSql(job?.queryConfig.sql ?? '')
    setTimestampColumn(job?.queryConfig.timestampColumn ?? '')
    setScheduleCron(job?.scheduleCron ?? '*/5 * * * *')
    setStartFrom('NEW_ONLY')
    setStartFromDate(undefined)
    setActiveTable(null)
    setPreview(null)
    setPreviewedSql(null)
    setPreviewError(null)
    setErrors({})
    // Truy vấn đang sửa đã có SQL — chạy thử luôn để bảng kết quả (và ô chọn cột thời gian nằm
    // trong đó) có mặt ngay, khỏi bắt người dùng bấm một phát chỉ để thấy thứ vốn đã xong.
    if (job) runPreview(job.queryConfig.sql, job.queryConfig.timestampColumn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job])

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
    const sqlIssue = parsed.success
      ? null
      : parsed.error.issues.find((issue) => issue.path[0] === 'sql')
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
          setPreviewedSql(sqlToRun)
          setPreviewError(null)
          // Đoán cột thời gian khi người dùng chưa chọn. Ưu tiên cột có kiểu thời gian thật;
          // lấy bừa cột đầu thì truy vấn `SELECT id, ts, ...` sẽ chọn nhầm `id`.
          if (!columnToUse && result.columns.length > 0) {
            const timeColumn = result.columns.find((column) =>
              /^timestamp|^date|^time/i.test(column.dataType)
            )
            setTimestampColumn((timeColumn ?? result.columns[0]).name)
          }
        },
        onError: (error) => {
          setPreview(null)
          setPreviewedSql(null)
          setPreviewError(getApiErrorMessage(error, 'Không chạy được truy vấn'))
        },
      }
    )
  }

  function handleSave() {
    const parsed = externalSourceJobSchema.safeParse({ name, sql, timestampColumn, scheduleCron })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message
      })
      setErrors(next)
      return
    }
    if (!job && startFrom === 'FROM_DATE' && !startFromDate) {
      setErrors({ startFromDate: 'Chọn ngày bắt đầu đọc' })
      return
    }
    setErrors({})

    const queryConfig = { sql, timestampColumn }
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Lưu truy vấn thất bại'))

    if (job) {
      updateMutation.mutate(
        { id: job.id, payload: { name, queryConfig, scheduleCron } },
        {
          onSuccess: (saved) => {
            toast.success('Đã cập nhật truy vấn')
            onSaved(saved, preview?.columns ?? [])
          },
          onError,
        }
      )
    } else {
      createMutation.mutate(
        { name, queryConfig, scheduleCron, startFrom, startFromDate: startFromDate?.toISOString() },
        {
          onSuccess: (saved) => {
            toast.success('Đã tạo truy vấn và xếp lịch chạy')
            onSaved(saved, preview?.columns ?? [])
          },
          onError,
        }
      )
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Bảng kết quả chốt 5 dòng nên nội dung cao có giới hạn — để chính khối này cuộn, khỏi
          lồng thêm vùng cuộn nào bên trong. */}
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[236px_minmax(0,1fr)]">
        {/* Cây bảng vẫn tự cuộn: database khách hàng có thể hàng trăm bảng. */}
        <div className="min-h-0 lg:max-h-[26rem] lg:border-r lg:border-border lg:pr-4">
          {schemaError ? (
            <p className="text-sm text-muted-foreground">
              Không đọc được cấu trúc cơ sở dữ liệu. Kiểm tra lại kết nối của nguồn này.
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
            <FieldLabel htmlFor="job-sql">Câu truy vấn</FieldLabel>
            <SqlEditor
              id="job-sql"
              ref={sqlRef}
              value={sql}
              onChange={(next) => setSql(next)}
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
            result={isPreviewCurrent ? preview : null}
            isPending={previewMutation.isPending}
            error={previewError}
            timestampColumn={timestampColumn}
            headerAction={
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
                            <span className="text-[11px] text-muted-foreground">
                              {column.dataType}
                            </span>
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
        <SettingRow label="Tên">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Tên truy vấn"
            aria-invalid={!!errors.name}
            className="h-8 max-w-80"
          />
          {errors.name && <span className="text-[12.5px] text-destructive">{errors.name}</span>}
        </SettingRow>

        <SettingRow label="Lịch chạy">
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
          <SettingRow label="Bắt đầu đọc từ">
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

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <LoadingButton
          variant="outline"
          isPending={previewMutation.isPending}
          disabled={!sql.trim() || !!sqlHint}
          onClick={() => runPreview()}
        >
          <Play data-icon="inline-start" />
          Chạy thử
        </LoadingButton>
        {/* Lưu khoá tới khi câu SQL hiện tại đã chạy thử thành công — sửa câu là mở khoá lại,
            nên không thể lưu một câu chưa bao giờ chạy qua. */}
        <LoadingButton isPending={isSaving} disabled={!isPreviewCurrent} onClick={handleSave}>
          <Save data-icon="inline-start" />
          {submitLabel}
        </LoadingButton>
      </div>
    </div>
  )
}
