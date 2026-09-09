import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Trên ngưỡng này mới hiện ô tìm — ít mục thì mắt quét nhanh hơn gõ. */
const SEARCH_THRESHOLD = 8

export interface MultiSelectOption {
  value: number
  label: string
  /** Dòng phụ mờ bên dưới nhãn — VD đơn vị tổ chức của gateway. */
  hint?: string
}

/** Ô chọn nhiều mục dạng danh sách tick, cho những tập không phải cây (gateway, nguồn dữ liệu). */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Tất cả',
  emptyLabel = 'Không có mục nào',
  invalid,
  className,
}: {
  id?: string
  options: MultiSelectOption[]
  value: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  emptyLabel?: string
  invalid?: boolean
  className?: string
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
  const summary = options.filter((option) => selected.has(option.value)).map((option) => option.label).join(', ')

  function toggle(id: number) {
    const next = new Set(value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={invalid}
          className={cn('w-full justify-between font-normal', !summary && 'text-muted-foreground', className)}
        >
          <span className="truncate">{summary || placeholder}</span>
          <ChevronDown data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        {options.length > SEARCH_THRESHOLD && (
          <div className="p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm..."
              className="h-8"
            />
          </div>
        )}
        <div role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto p-1">
          {visible.length === 0 && (
            <p className="p-3 text-center text-sm text-muted-foreground">{emptyLabel}</p>
          )}
          {visible.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={selected.has(option.value)}
              onClick={() => toggle(option.value)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {/* Ô tick vẽ bằng span chứ không dùng component Checkbox: Checkbox của Radix render ra
                  một <button>, lồng trong <button> của cả dòng là HTML không hợp lệ (React cảnh báo
                  và trình duyệt tự gỡ lồng nhau, làm hỏng vùng bấm). */}
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                  selected.has(option.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input'
                )}
              >
                {selected.has(option.value) && <Check className="size-3" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.hint && (
                  <span className="truncate text-xs text-muted-foreground">{option.hint}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
