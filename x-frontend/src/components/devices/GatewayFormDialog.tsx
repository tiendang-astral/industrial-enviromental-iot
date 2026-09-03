import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { getApiErrorMessage } from '@/lib/apiError'
import { createGatewaySchema, type CreateGatewayFormValues } from '@/lib/gatewaySchema'
import { useCreateGatewayMutation } from '@/queries/useCreateGatewayMutation'
import { useUpdateGatewayMutation } from '@/queries/useUpdateGatewayMutation'
import type { Gateway } from '@/types/gateway'
import type { TenantNode } from '@/types/tenantNode'

interface GatewayFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cả cây tổ chức — picker cần cấp trên để vẽ nhánh, dù chỉ SITE mới chọn được. */
  nodes: TenantNode[]
  /** null = tạo mới, có giá trị = sửa. Form tạo và sửa chỉ khác nhau ở nhãn nên dùng chung. */
  gateway: Gateway | null
}

export function GatewayFormDialog({
  open,
  onOpenChange,
  nodes,
  gateway,
}: GatewayFormDialogProps) {
  const createMutation = useCreateGatewayMutation()
  const updateMutation = useUpdateGatewayMutation()
  const isEdit = !!gateway
  const [siteId, setSiteId] = useState('')
  const [siteError, setSiteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGatewayFormValues>({
    resolver: zodResolver(createGatewaySchema),
    defaultValues: { name: '', macAddress: '' },
  })

  useEffect(() => {
    if (!open) return
    setSiteError(null)
    setSiteId(gateway ? String(gateway.tenantNodeId) : '')
    reset({ name: gateway?.name ?? '', macAddress: gateway?.macAddress ?? '' })
  }, [open, gateway, reset])

  function onSubmit(values: CreateGatewayFormValues) {
    if (!siteId) {
      setSiteError('Vui lòng chọn xưởng/chuồng trại')
      return
    }

    if (isEdit && gateway) {
      updateMutation.mutate(
        {
          id: gateway.id,
          payload: {
            name: values.name,
            macAddress: values.macAddress,
            tenantNodeId: Number(siteId),
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Cập nhật gateway thành công')
          },
          onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật thất bại')),
        }
      )
      return
    }

    createMutation.mutate(
      { tenantNodeId: Number(siteId), name: values.name, macAddress: values.macAddress },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Tạo gateway thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo gateway thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Sửa thiết bị' : 'Thêm thiết bị'}
      submitLabel={isEdit ? 'Lưu thay đổi' : 'Tạo gateway'}
      isPending={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!siteError}>
        <FieldLabel htmlFor="gateway-site" data-required>
          Chọn xưởng / chuồng trại
        </FieldLabel>
        {/* Backend bắt buộc gateway gắn vào node kiểu SITE, nhưng vẫn hiện cả cây (cấp trên bị
            khoá) để người dùng thấy xưởng đang nằm dưới chi nhánh nào. */}
        <TenantNodePicker
          id="gateway-site"
          mode="single"
          nodes={nodes}
          selectable={(node) => node.nodeType === 'SITE'}
          placeholder="Chọn xưởng / chuồng trại"
          value={siteId ? Number(siteId) : null}
          onChange={(id) => {
            setSiteId(String(id))
            setSiteError(null)
          }}
          invalid={!!siteError}
        />
        <FieldError>{siteError}</FieldError>
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="gateway-name" data-required>Tên gateway</FieldLabel>
        <Input id="gateway-name" aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <Field data-invalid={!!errors.macAddress}>
        <FieldLabel htmlFor="gateway-mac" data-required>MAC address</FieldLabel>
        <Input
          id="gateway-mac"
          placeholder="AA:BB:CC:DD:EE:FF"
          aria-invalid={!!errors.macAddress}
          {...register('macAddress')}
        />
        <FieldError errors={[errors.macAddress]} />
      </Field>
    </FormDialog>
  )
}
