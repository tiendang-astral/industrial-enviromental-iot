import { forwardRef, useMemo } from 'react'
import { CURSOR_TOKEN } from '@/lib/externalSourceJobSchema'
import { cn } from '@/lib/utils'

const KEYWORDS =
  /\b(SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|OFFSET|AS|WITH|CASE|WHEN|THEN|ELSE|END|NOT|NULL|IS|IN|BETWEEN|DISTINCT|HAVING|ASC|DESC|UNION|ALL)\b/gi

/**
 * Textarea trong suốt chồng lên một lớp <pre> đã tô màu — cách này giữ được caret, undo và
 * IME của textarea thật, chỉ cần font/padding/line-height của 2 lớp khớp tuyệt đối.
 * Chỉ tô 3 thứ đáng chú ý: từ khoá, chuỗi, và :cursor (thứ người dùng hay quên nhất).
 */
function highlight(sql: string) {
  const escaped = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/'([^']*)'/g, '<span class="text-ok">\'$1\'</span>')
    .replace(KEYWORDS, '<span class="font-medium text-primary">$&</span>')
    .replace(
      new RegExp(CURSOR_TOKEN + '\\b', 'g'),
      '<span class="rounded-sm bg-warning/15 px-1 font-medium text-warning">$&</span>'
    )
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const SqlEditor = forwardRef<HTMLTextAreaElement, {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
  invalid?: boolean
  id?: string
  rows?: number
  /** Hiện khi ô rỗng — textarea ở đây trong suốt nên placeholder gốc không nhìn thấy được. */
  placeholder?: string
}>(function SqlEditor({ value, onChange, onRun, invalid, id, rows = 12, placeholder }, ref) {
  const highlighted = useMemo(
    () =>
      (value
        ? highlight(value)
        : `<span class="text-muted-foreground">${escapeHtml(placeholder ?? '')}</span>`) + '\n',
    [value, placeholder]
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-input bg-background',
        'focus-within:ring-2 focus-within:ring-ring',
        invalid && 'border-destructive'
      )}
    >
      <pre
        aria-hidden="true"
        style={{ minHeight: `${rows * 1.7 * 12.5 + 24}px` }}
        className="pointer-events-none overflow-x-auto p-3 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        spellCheck={false}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (onRun && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            onRun()
          }
        }}
        className={cn(
          'absolute inset-0 size-full resize-none bg-transparent p-3 font-mono text-[12.5px] leading-[1.7]',
          'whitespace-pre-wrap break-words text-transparent caret-foreground outline-none'
        )}
      />
    </div>
  )
})
