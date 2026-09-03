import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /**
   * Câu hỏi xác nhận in đậm, đứng trên phần mô tả — VD `Bạn có chắc chắn muốn xóa "Xưởng A"?`.
   * Tên đối tượng nằm ngay trong câu hỏi để người dùng đọc một dòng là biết mình đang xóa cái gì.
   */
  question?: React.ReactNode
  /** Nêu rõ hậu quả, không chỉ hỏi "bạn có chắc không" — người dùng cần biết cái gì sẽ xảy ra. */
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  question,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {question && (
              <span className="block pb-2 font-medium text-foreground">{question}</span>
            )}
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Footer cùng màu với thân dialog — dải xám `bg-muted/50` mặc định của shadcn cắt hộp
            thoại thành hai mảng, trong khi ở đây nút bấm là phần tiếp nối của câu hỏi phía trên. */}
        <AlertDialogFooter className="border-t-0 bg-transparent">
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className={cn(destructive && buttonVariants({ variant: 'destructive' }))}
            onClick={(event) => {
              // Giữ dialog mở tới khi mutation xong, để người dùng thấy spinner thay vì
              // dialog đóng rồi mới biết thành công hay lỗi qua toast.
              event.preventDefault()
              onConfirm()
            }}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
