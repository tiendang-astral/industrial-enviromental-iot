import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  isPending?: boolean
}

/**
 * Button không có prop loading sẵn — chuẩn shadcn là compose Spinner + disabled.
 * Nhãn giữ nguyên khi đang chạy (không đổi thành "Đang tạo...") để nút không nhảy chiều rộng.
 */
export function LoadingButton({
  isPending = false,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isPending} {...props}>
      {isPending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
