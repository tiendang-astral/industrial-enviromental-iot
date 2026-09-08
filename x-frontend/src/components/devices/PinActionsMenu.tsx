import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EditPinDialog } from '@/components/devices/EditPinDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDeleteGatewayPinMutation } from '@/queries/useDeleteGatewayPinMutation'
import { useUpdateGatewayPinMutation } from '@/queries/useUpdateGatewayPinMutation'
import { cn } from '@/lib/utils'
import type { GatewayPin } from '@/types/gatewayPin'

/**
 * Ba việc cấu hình một chân (đổi tên, tắt/bật, xóa) gom vào một menu duy nhất, dùng chung cho
 * chip ở sơ đồ và card ở tab dữ liệu.
 *
 * Vì sao là menu chứ không phải nút rời: card chân OUTPUT đã có sẵn một `Switch` gửi lệnh xuống
 * thiết bị thật ngoài hiện trường. Đặt thêm một `Switch` "tắt chân" cạnh nó là hai công tắc giống
 * hệt nhau cách nhau vài pixel, một cái bật máy bơm. Toggle cấu hình vì vậy lùi hẳn vào menu.
 */
export function PinActionsMenu({
  gatewayId,
  pin,
  className,
}: {
  gatewayId: number
  pin: GatewayPin
  className?: string
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const updateMutation = useUpdateGatewayPinMutation(gatewayId)
  const deleteMutation = useDeleteGatewayPinMutation(gatewayId)

  // Radix đóng menu sau onSelect và kéo theo cả dialog vừa mở — hoãn một nhịp mới mở được
  // (cùng lỗi đã gặp ở nút "Áp dụng mẫu" của Dashboard, xem PLAN.md Phase 4).
  function openAfterMenuCloses(open: (value: boolean) => void) {
    setTimeout(() => open(true), 0)
  }

  function toggleEnabled() {
    updateMutation.mutate(
      { pinId: pin.id, payload: { enabled: !pin.enabled } },
      {
        onSuccess: () => toast.success(pin.enabled ? `Đã tắt ${pin.name}` : `Đã bật ${pin.name}`),
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật pin thất bại')),
      }
    )
  }

  function confirmDelete() {
    deleteMutation.mutate(pin.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        toast.success('Đã xóa pin')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa pin thất bại')),
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-7 shrink-0 text-muted-foreground', className)}
          >
            <MoreHorizontal />
            <span className="sr-only">Tùy chọn cho {pin.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => openAfterMenuCloses(setIsEditOpen)}>
            <Pencil />
            Đổi tên pin
          </DropdownMenuItem>
          <DropdownMenuItem disabled={updateMutation.isPending} onSelect={toggleEnabled}>
            {pin.enabled ? <PowerOff /> : <Power />}
            {pin.enabled ? 'Tắt pin' : 'Bật pin'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => openAfterMenuCloses(setIsDeleteOpen)}
          >
            <Trash2 />
            Xóa pin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isEditOpen && (
        <EditPinDialog gatewayId={gatewayId} pin={pin} onOpenChange={setIsEditOpen} />
      )}

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa pin này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa <span className="font-semibold">&ldquo;{pin.name}&rdquo;</span>?
          </>
        }
        description="Pin và kênh dữ liệu gắn với nó sẽ bị xóa vĩnh viễn. Widget dashboard đang dùng kênh này sẽ mất nguồn. Số liệu đã ghi vào InfluxDB vẫn giữ nguyên. Muốn tạm ngừng nhận dữ liệu thì dùng «Tắt pin» thay vì xóa."
        confirmLabel="Xóa pin"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
