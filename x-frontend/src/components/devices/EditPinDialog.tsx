import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { pinLabel } from '@/lib/pinLabels'
import { useUpdateGatewayPinMutation } from '@/queries/useUpdateGatewayPinMutation'
import type { GatewayPin } from '@/types/gatewayPin'

const schema = z.object({ name: z.string().trim().min(1, 'Vui lòng nhập tên pin') })
type FormValues = z.infer<typeof schema>

/**
 * Sửa pin = đổi tên. Loại pin và số chân KHÔNG sửa được: chúng mô tả một chân vật lý có thật trên
 * gateway, và `PUT /gateways/{id}/pins/{pinId}` ở backend cũng chỉ nhận `name`/`enabled`. Khai báo
 * sai loại/số chân thì phải xoá pin rồi tạo lại.
 */
export function EditPinDialog({
  gatewayId,
  pin,
  onOpenChange,
}: {
  gatewayId: number
  pin: GatewayPin | null
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateGatewayPinMutation(gatewayId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  useEffect(() => {
    if (pin) reset({ name: pin.name })
  }, [pin, reset])

  if (!pin) return null

  function onSubmit(values: FormValues) {
    if (!pin) return
    updateMutation.mutate(
      { pinId: pin.id, payload: { name: values.name } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã đổi tên pin')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật pin thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Sửa pin"
      description={`${pinLabel(pin.type, pin.pinNumber)} — loại và số chân gắn với phần cứng nên không đổi được.`}
      submitLabel="Lưu"
      isPending={updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="edit-pin-name" data-required>
          Tên pin
        </FieldLabel>
        <Input id="edit-pin-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}
