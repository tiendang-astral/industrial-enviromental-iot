import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ancestorIdsOf,
  childrenByParentOf,
  descendantIdsOf,
  orderNodesDepthFirst,
} from '@/lib/tenantNodeTree'
import { NODE_ICON } from '@/lib/tenantNodeLabels'
import { cn } from '@/lib/utils'
import type { TenantNode } from '@/types/tenantNode'

const INDENT_STEP = 18

interface BaseProps {
  id?: string
  nodes: TenantNode[]
  /**
   * Node nào chọn được. Node không thỏa **vẫn hiện ra** nhưng bị khoá — lọc bỏ hẳn thì cây gãy
   * nhánh và người dùng mất mốc định vị (VD gateway chỉ gắn được vào Xưởng, nhưng phải thấy Xưởng
   * đó nằm dưới chi nhánh nào).
   */
  selectable?: (node: TenantNode) => boolean
  /** Nhãn hiển thị mờ ngay trong ô, trước giá trị đã chọn — gọn hơn nhãn rời bên ngoài. */
  label?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
}

type TenantNodePickerProps =
  | (BaseProps & { mode: 'single'; value: number | null; onChange: (id: number) => void })
  | (BaseProps & { mode: 'multiple'; value: number[]; onChange: (ids: number[]) => void })

/**
 * Ô chọn đơn vị tổ chức theo cây, dùng chung cho mọi form có trường tổ chức.
 *
 * `multiple` lan hai chiều: tick một node thì tick cả cây con, rồi cha nào đã đủ toàn bộ con cũng
 * tự tick theo; bỏ tick thì bỏ cả cây con và mọi tổ tiên. Quyền/phạm vi trong hệ thống vốn mở rộng
 * xuống toàn bộ cây con qua ltree, nên đây là cách duy nhất để ô tick nói đúng thứ sẽ được lưu.
 */
export function TenantNodePicker(props: TenantNodePickerProps) {
  const { id, nodes, selectable, label, placeholder = 'Chọn tổ chức', invalid, disabled, className } = props
  const [open, setOpen] = useState(false)

  const { ordered, byId, childrenByParent, minDepth } = useMemo(
    () => ({
      ordered: orderNodesDepthFirst(nodes),
      byId: new Map(nodes.map((node) => [node.id, node])),
      childrenByParent: childrenByParentOf(nodes),
      minDepth: nodes.length ? Math.min(...nodes.map((node) => node.depth)) : 0,
    }),
    [nodes]
  )

  const canSelect = (node: TenantNode) => (selectable ? selectable(node) : true)
  const selectedIds = props.mode === 'single' ? [] : props.value
  const selected = new Set(selectedIds)

  function toggleMultiple(node: TenantNode, checked: boolean) {
    if (props.mode !== 'multiple') return
    const next = new Set(props.value)
    const subtree = [node.id, ...descendantIdsOf(node.id, childrenByParent)].filter((nodeId) => {
      const candidate = byId.get(nodeId)
      return candidate ? canSelect(candidate) : false
    })
    const ancestors = ancestorIdsOf(node, byId)

    if (checked) {
      for (const nodeId of subtree) next.add(nodeId)
      // Lên dần từ cha gần nhất, gặp cha đầu tiên chưa đủ con thì dừng — các cấp trên chắc chắn
      // cũng chưa đủ.
      for (const ancestorId of ancestors) {
        const children = (childrenByParent.get(ancestorId) ?? []).filter(canSelect)
        if (!children.length || !children.every((child) => next.has(child.id))) break
        next.add(ancestorId)
      }
    } else {
      for (const nodeId of subtree) next.delete(nodeId)
      for (const ancestorId of ancestors) next.delete(ancestorId)
    }
    props.onChange([...next])
  }

  // Tóm tắt chỉ nêu node ở mức cao nhất — tick một chi nhánh mà kê hết tên xưởng bên dưới thì nút
  // trigger đầy chữ.
  const summary = useMemo(() => {
    if (props.mode === 'single') return props.value ? (byId.get(props.value)?.name ?? null) : null
    const topMost = props.value.filter((nodeId) => {
      const node = byId.get(nodeId)
      return node ? !ancestorIdsOf(node, byId).some((a) => selected.has(a)) : false
    })
    return topMost.length
      ? topMost.map((nodeId) => byId.get(nodeId)?.name).filter(Boolean).join(', ')
      : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, props.value, byId])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Khớp hẳn kiểu SelectTrigger: cùng viền --input, cùng nền --field. Để nguyên `outline`
            thì nút ăn `dark:bg-input/30`, đứng cạnh một ô Select nó đọc ra như bị vô hiệu hoá. */}
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            'w-full justify-between border-input bg-field font-normal dark:bg-field dark:hover:bg-field',
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {label && <span className="shrink-0 text-muted-foreground">{label}</span>}
            <span className={cn('truncate', !summary && 'text-muted-foreground')}>
              {summary ?? placeholder}
            </span>
          </span>
          <ChevronDown className="shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1">
        <div className="max-h-64 overflow-y-auto">
          {ordered.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">Tenant chưa có đơn vị nào.</p>
          )}

          {ordered.map((node) => {
            const depth = node.depth - minDepth
            const allowed = canSelect(node)
            const indent = { paddingInlineStart: depth * INDENT_STEP + 8 }
            // Ký hiệu rẽ nhánh, cùng glyph với bảng cây trang Tổ chức — không có nó thì các dòng
            // chỉ khác nhau ở lề, đọc ra là danh sách thụt lề chứ không ra quan hệ cha-con.
            const branch = depth > 0 && (
              <span
                aria-hidden
                className="mb-1.5 size-2.5 shrink-0 rounded-bl-[3px] border-b border-l border-border"
              />
            )
            const NodeIcon = NODE_ICON[node.nodeType]
            const icon = <NodeIcon className="size-3.5 shrink-0 text-muted-foreground" />

            if (props.mode === 'multiple') {
              return (
                <Label
                  key={node.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm py-1.5 pe-2 text-sm font-normal',
                    allowed ? 'hover:bg-accent' : 'text-muted-foreground'
                  )}
                  style={indent}
                >
                  {branch}
                  <Checkbox
                    checked={selected.has(node.id)}
                    disabled={!allowed}
                    onCheckedChange={(checked) => toggleMultiple(node, checked === true)}
                  />
                  {icon}
                  <span className="truncate">{node.name}</span>
                </Label>
              )
            }

            const isSelected = props.value === node.id
            return (
              <button
                key={node.id}
                type="button"
                disabled={!allowed}
                onClick={() => {
                  props.onChange(node.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-sm py-1.5 pe-2 text-start text-sm',
                  allowed
                    ? 'hover:bg-accent'
                    : 'cursor-not-allowed text-muted-foreground/60',
                  isSelected && 'font-medium'
                )}
                style={indent}
              >
                {branch}
                {icon}
                <span className="truncate">{node.name}</span>
                {isSelected && <Check className="ms-auto size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
