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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <LoadingButton type="submit" isPending={isPending}>
              {submitLabel}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
