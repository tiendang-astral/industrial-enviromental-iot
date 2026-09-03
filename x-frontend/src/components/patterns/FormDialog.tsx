import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { cn } from '@/lib/utils'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  cancelLabel?: string
  isPending?: boolean
  /** Chặn submit khi form còn điều kiện chưa thoả (VD: chưa thử kết nối thành công). */
  submitDisabled?: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
  /** Các <Field> của form — FormDialog đã bọc sẵn FieldGroup nên không cần bọc lại. */
  children: React.ReactNode
  className?: string
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Lưu',
  cancelLabel = 'Hủy',
  isPending = false,
  submitDisabled = false,
  onSubmit,
  children,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
          <FieldGroup>{children}</FieldGroup>
          {/* Footer cùng màu với thân dialog, xem ghi chú ở ConfirmDialog. */}
          <DialogFooter className="border-t-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <LoadingButton type="submit" isPending={isPending} disabled={submitDisabled}>
              {submitLabel}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
