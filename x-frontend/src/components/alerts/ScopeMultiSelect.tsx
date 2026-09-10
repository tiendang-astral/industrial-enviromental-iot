import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ignoreOwnLabelOutside } from '@/lib/popoverLabel'
import { cn } from '@/lib/utils'

/** Trên ngưỡng này mới hiện ô tìm — ít mục thì mắt quét nhanh hơn gõ. */
const SEARCH_THRESHOLD = 8
/** Số tên liệt kê trên ô trước khi gộp phần dư thành "+N". */
const SUMMARY_NAMES = 2

/**
 * Nội dung ô khi đã chọn. Không nối hết tên: chọn 9 thiết bị ra một chuỗi dài hơn cả form, cắt
 * bằng "…" thì mất đúng thông tin cần — là đã chọn bao nhiêu.
 */
function summarize(labels: string[], total: number, noun: string): string {
  if (labels.length === 0) return ''
  if (total > 1 && labels.length === total) return `Tất cả ${noun} (${total})`
  if (labels.length <= SUMMARY_NAMES) return labels.join(', ')
  return `${labels.slice(0, SUMMARY_NAMES).join(', ')} +${labels.length - SUMMARY_NAMES}`
}

export interface ScopeOption {
  id: number
  label: string
  /** Dòng phụ bên phải: tên đơn vị của thiết bị/nguồn, để hai mục trùng tên còn phân biệt được. */
  hint?: string
}

/**
 * Ô đa chọn cho phạm vi quy tắc cảnh báo — thiết bị hoặc nguồn dữ liệu.
 *
 * Cùng khuôn `MetricMultiSelect` (Popover + Checkbox + ô tìm khi danh sách dài) nhưng thêm dòng
 * "Chọn tất cả". Không tách chung một component với nó: bên kia hiển thị đơn vị đo và không có
 * khái niệm chọn tất cả, gộp lại sẽ thành một component đầy cờ bật/tắt.
 *
 * "Chọn tất cả" ghi ra ĐÚNG danh sách id đang có, không phải một dấu "mọi thứ" — thiết bị lắp thêm
 * sau sẽ không tự được phủ. Đó là hệ quả trực tiếp của việc bắt buộc chọn ít nhất một.
 */
export function ScopeMultiSelect({
  id,
  options,
  value,
  onChange,
  invalid,
  placeholder,
  noun,
  searchLabel,
  emptyText,
}: {
  id?: string
  options: ScopeOption[]
  value: number[]
  onChange: (ids: number[]) => void
  invalid?: boolean
  placeholder: string
  /** Danh từ số nhiều cho ô tóm tắt — "Tất cả thiết bị (9)". */
  noun: string
  searchLabel: string
  emptyText: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) || option.hint?.toLowerCase().includes(needle)
    )
  }, [options, query])

  const selected = new Set(value)
  const summary = summarize(
    options.filter((option) => selected.has(option.id)).map((option) => option.label),
    options.length,
    noun
  )
  const allSelected = options.length > 0 && options.every((option) => selected.has(option.id))

  function toggle(optionId: number) {
    const next = new Set(value)
    if (next.has(optionId)) next.delete(optionId)
    else next.add(optionId)
    onChange([...next])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={options.length === 0}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-9 w-full justify-between border-input bg-field font-normal dark:bg-field',
            !summary && 'text-muted-foreground'
          )}
        >
          {/* min-w-0: con của flex mặc định không co nhỏ hơn nội dung, `truncate` sẽ không cắt. */}
          <span className="min-w-0 truncate">{summary || placeholder}</span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        // Khoá xuống dưới như MetricMultiSelect: mỗi lần tick là ô tóm tắt dài thêm, Radix lật
        // popover lên trên và nội dung nhảy ngay dưới con trỏ.
        avoidCollisions={false}
        // Nhãn phía trên trỏ vào nút này — bấm nhãn khi đang mở phải ĐÓNG, không được mở lại.
        onInteractOutside={ignoreOwnLabelOutside(id)}
        className="flex max-h-56 w-(--radix-popover-trigger-width) flex-col overflow-hidden p-0"
      >
        {options.length > SEARCH_THRESHOLD && (
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className="h-8"
            />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
          {/* Ngoài danh sách cuộn thì đứng yên khi kéo — nó tác động lên toàn bộ, không phải một mục. */}
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : options.map((option) => option.id))}
              className="mb-1 flex items-center gap-2 rounded-md border-b border-border px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Checkbox checked={allSelected} tabIndex={-1} className="pointer-events-none" />
              <span className="flex-1 truncate font-medium">Chọn tất cả</span>
              <span className="text-[12.5px] tabular text-muted-foreground">{options.length}</span>
            </button>
          )}

          {visible.map((option) => {
            const isSelected = selected.has(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                <span className="flex-1 truncate">{option.label}</span>
                {option.hint && (
                  <span className="max-w-28 truncate text-[12.5px] text-muted-foreground">{option.hint}</span>
                )}
                {isSelected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
          {visible.length === 0 && (
            <p className="px-2 py-6 text-center text-[12.5px] text-muted-foreground">{emptyText}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
