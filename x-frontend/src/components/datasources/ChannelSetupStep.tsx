import { CalendarDays, Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
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
import { EmptyState } from '@/components/patterns/EmptyState'
import { uniqueName } from '@/lib/datastreamName'
import { formatDateTime } from '@/lib/datetime'
import { suggestMetricCode } from '@/lib/sqlTemplate'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/metric'
import type { ExternalSourceJob, PreviewColumn, StartFrom } from '@/types/externalSource'

const START_FROM_OPTIONS: { value: StartFrom; label: string }[] = [
  { value: 'NEW_ONLY', label: 'chỉ dữ liệu mới từ giờ' },
  { value: 'ALL_HISTORY', label: 'toàn bộ lịch sử' },
  { value: 'FROM_DATE', label: 'từ ngày cụ thể' },
]

export interface ChannelDraft {
  sourceField: string
  selected: boolean
  metricId: string
  name: string
}

export interface ChannelSetupValue {
  drafts: ChannelDraft[]
  startFrom: StartFrom
  startFromDate: Date | undefined
}

/** Cột nào đáng gợi ý thành kênh: bỏ cột mốc thời gian và cột đã có kênh gắn vào. */
export function buildChannelDrafts({
  columns,
  timestampColumn,
  metrics,
  boundFields,
  takenNames,
  jobName,
}: {
  columns: PreviewColumn[]
  timestampColumn: string
  metrics: Metric[]
  boundFields: string[]
  takenNames: string[]
  jobName: string
}): ChannelDraft[] {
  const bound = boundFields.map((field) => field.toLowerCase())
  const names = [...takenNames]

  return columns
    .filter(
      (column) =>
        column.name.toLowerCase() !== timestampColumn.toLowerCase() &&
        !bound.includes(column.name.toLowerCase())
    )
    .map((column) => {
      const suggestedCode = suggestMetricCode(column.name)
      const suggested = suggestedCode
        ? metrics.find((metric) => metric.code === suggestedCode)
        : undefined
      const base = suggested ? `${suggested.name} · ${jobName}` : column.name
      const name = uniqueName(base, names)
      names.push(name)

      return {
        sourceField: column.name,
        // Chỉ tick sẵn cột đoán được metric. Cột không đoán ra mà vẫn tick thì người dùng phải
        // gỡ tick thủ công cho từng cột rác (id, device_name...) — bắt làm việc ngược.
        selected: !!suggested,
        metricId: suggested ? String(suggested.id) : '',
        name,
      }
    })
}

/**
 * Bước 2 của luồng tạo job: gán cột thành kênh ngay, không phải đóng dialog rồi mở lại chỗ khác.
 *
 * Khác `DatastreamFormDialog` (gán từng cột một, mở từ modal chi tiết job) ở chỗ nó làm cả loạt
 * và chỉ hỏi mốc đọc **một lần** cho cả lô thay vì hỏi lại ở mỗi kênh.
 */
export function ChannelSetupStep({
  job,
  metrics,
  value,
  onChange,
}: {
  job: ExternalSourceJob
  metrics: Metric[]
  value: ChannelSetupValue
  onChange: (next: ChannelSetupValue) => void
}) {
  // Job vừa tạo thì chưa chạy lần nào nên chưa bỏ lỡ gì — không hỏi mốc cho một lỗ hổng
  // không tồn tại. Chỉ job đang sửa (đã chạy) mới cần.
  const hasGap = !!job.lastRunAt

  function patch(index: number, changes: Partial<ChannelDraft>) {
    onChange({
      ...value,
      drafts: value.drafts.map((draft, position) =>
        position === index ? { ...draft, ...changes } : draft
      ),
    })
  }

  if (value.drafts.length === 0) {
    return (
      <EmptyState
        icon={Check}
        title="Mọi cột đều đã có kênh"
        description="Truy vấn này không còn cột nào chưa được gán. Bấm Xong để đóng."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Chọn cột cần theo dõi và gán metric cho nó. Cột không chọn vẫn được job đọc về, chỉ là
        chưa dùng được trên dashboard — gán sau lúc nào cũng được.
      </p>

      <div className="flex flex-col gap-2">
        {value.drafts.map((draft, index) => (
          <div
            key={draft.sourceField}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors duration-[--motion-fast] ease-[--motion-ease]',
              draft.selected ? 'border-primary/40 bg-primary/5' : 'border-border'
            )}
          >
            <Checkbox
              checked={draft.selected}
              onCheckedChange={(checked) => patch(index, { selected: checked === true })}
              aria-label={`Tạo kênh từ cột ${draft.sourceField}`}
            />
            <span className="w-40 shrink-0 truncate font-mono text-[12.5px]">
              {draft.sourceField}
            </span>

            <Select
              value={draft.metricId}
              onValueChange={(next) => patch(index, { metricId: next, selected: true })}
            >
              <SelectTrigger size="sm" className="w-52" aria-label={`Metric cho ${draft.sourceField}`}>
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

            <Input
              value={draft.name}
              onChange={(event) => patch(index, { name: event.target.value })}
              className="h-8 min-w-0 flex-1"
              aria-label={`Tên kênh cho ${draft.sourceField}`}
              disabled={!draft.selected}
            />
          </div>
        ))}
      </div>

      {hasGap && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-[12.5px] text-muted-foreground">Đọc dữ liệu từ</span>
          {START_FROM_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={value.startFrom === option.value ? 'default' : 'outline'}
              onClick={() => onChange({ ...value, startFrom: option.value })}
            >
              {option.label}
            </Button>
          ))}
          {value.startFrom === 'FROM_DATE' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(!value.startFromDate && 'text-muted-foreground')}
                >
                  <CalendarDays data-icon="inline-start" />
                  {value.startFromDate
                    ? formatDateTime(value.startFromDate.toISOString())
                    : 'Chọn ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.startFromDate}
                  onSelect={(next) => onChange({ ...value, startFromDate: next })}
                />
              </PopoverContent>
            </Popover>
          )}
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Link2 className="size-3.5" />
            áp cho mọi kênh tạo ở bước này
          </span>
        </div>
      )}
    </div>
  )
}

/** Đặt ngoài component để cả dialog dùng chung khi quyết định bật/tắt nút Tạo. */
export function readyDrafts(value: ChannelSetupValue): ChannelDraft[] {
  return value.drafts.filter((draft) => draft.selected && draft.metricId && draft.name.trim())
}
