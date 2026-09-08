import { useState } from 'react'
import { Grid2x2Check, Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import type { DashboardTemplate } from '@/types/dashboard'

interface BoardEditToolbarProps {
  onAddWidget: () => void
  templates?: DashboardTemplate[]
  onSelectTemplate?: (template: DashboardTemplate) => void
  onCancel: () => void
  onSave: () => void
  isSaving: boolean
  /** Có thay đổi chưa ghi — nút Lưu chỉ sáng khi thật sự có gì để lưu. */
  dirty: boolean
}

/**
 * Thanh công cụ CHỈ hiện ở chế độ sửa. Ở chế độ xem board không có nút nào: bốn việc dưới đây đều
 * là sửa bố cục, để chúng thường trực thì màn hình xem số liệu lúc nào cũng có bốn nút không dùng tới.
 */
export function BoardEditToolbar({
  onAddWidget,
  templates,
  onSelectTemplate,
  onCancel,
  onSave,
  isSaving,
  dirty,
}: BoardEditToolbarProps) {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false)

  return (
    // sticky: board có thể dài hơn màn hình, kéo widget xuống cuối mà mất nút Lưu thì phải cuộn
    // ngược lên mới ghi được. top-14 = chiều cao AppTopbar.
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 backdrop-blur-sm">
      <Badge className="mr-1 gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm">
        <Pencil className="size-3" />
        Chỉnh sửa
      </Badge>

      <Button size="sm" variant="outline" onClick={onAddWidget}>
        <Plus data-icon="inline-start" />
        Thêm widget
      </Button>

      {onSelectTemplate && (
        <DropdownMenu open={isTemplateMenuOpen} onOpenChange={setIsTemplateMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={!templates?.length}>
              <Grid2x2Check data-icon="inline-start" />
              Áp dụng mẫu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {templates?.map((template) => (
              <DropdownMenuItem
                key={template.id}
                // preventDefault: Radix trả focus về trigger ngay khi menu tự đóng, nhịp đó nuốt luôn
                // hộp xác nhận vừa mở. Chặn hành vi mặc định rồi tự đóng menu.
                onSelect={(event) => {
                  event.preventDefault()
                  setIsTemplateMenuOpen(false)
                  onSelectTemplate(template)
                }}
              >
                {template.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="ms-auto flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
        <LoadingButton size="sm" isPending={isSaving} disabled={!dirty} onClick={onSave}>
          Lưu
        </LoadingButton>
      </div>
    </div>
  )
}
