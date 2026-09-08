import { useMemo, useState } from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '@/components/ui/combobox'

/**
 * Ô nhập nhiều người nhận dạng chip, có gợi ý.
 *
 * Giá trị tự do (email chưa có trong danh bạ, chat_id Telegram) được thêm vào chính danh sách
 * `items` khi người dùng gõ — nhờ vậy nó hiện thành một mục chọn được thay vì phải tự bắt phím
 * Enter và đánh nhau với cơ chế chọn của Combobox.
 */
export function RecipientChipsField({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  addLabel,
  invalid,
}: {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions: string[]
  placeholder: string
  /** Nhãn cho mục "thêm giá trị đang gõ", VD `Thêm email` */
  addLabel: string
  invalid?: boolean
}) {
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const typed = query.trim()
    const pool = new Set([...suggestions, ...value])
    if (typed) pool.add(typed)
    return [...pool]
  }, [suggestions, value, query])

  const typed = query.trim()
  const isNew = !!typed && !suggestions.includes(typed) && !value.includes(typed)

  return (
    <Combobox
      items={items}
      multiple
      // Không có autoHighlight thì không mục nào được tô sẵn, và Enter không có gì để chọn —
      // đó là lý do gõ email mới rồi Enter không ăn.
      autoHighlight
      value={value}
      onValueChange={(next: string[]) => {
        onChange(next)
        setQuery('')
      }}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <ComboboxChips aria-invalid={invalid || undefined}>
        <ComboboxValue>
          {(selected: string[]) => (
            <>
              {selected.map((item) => (
                <ComboboxChip key={item}>
                  {item}
                  <ComboboxPrimitive.ChipRemove aria-label={`Bỏ ${item}`} />
                </ComboboxChip>
              ))}
              <ComboboxChipsInput id={id} placeholder={selected.length ? '' : placeholder} />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>Gõ để thêm người nhận mới.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {isNew && item === typed ? `${addLabel} “${item}”` : item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
