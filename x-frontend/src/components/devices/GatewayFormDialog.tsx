import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormDialog } from '@/components/patterns/FormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { createGatewaySchema, type CreateGatewayFormValues } from '@/lib/gatewaySchema'
import { useCreateGatewayMutation } from '@/queries/useCreateGatewayMutation'
import { useUpdateGatewayMutation } from '@/queries/useUpdateGatewayMutation'
import type { Gateway } from '@/types/gateway'

interface GatewayFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sites: { id: number; name: string }[]
  /** null = tạo mới, có giá trị = sửa. Form tạo và sửa chỉ khác nhau ở nhãn nên dùng chung. */
  gateway: Gateway | null
}

export function GatewayFormDialog({
  open,
  onOpenChange,
  sites,
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
      setSiteError('Vui lòng chọn site')
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
      title={isEdit ? 'Sửa gateway' : 'Thêm gateway'}
      description={
        isEdit
          ? 'Đổi site sẽ chuyển toàn bộ dữ liệu mới của gateway sang site đó.'
          : 'Gateway phải được gán vào một site để dữ liệu cảm biến biết thuộc về đâu.'
      }
      submitLabel={isEdit ? 'Lưu thay đổi' : 'Tạo gateway'}
      isPending={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!siteError}>
        <FieldLabel htmlFor="gateway-site">Site</FieldLabel>
        <Select
          value={siteId}
          onValueChange={(value) => {
            setSiteId(value)
            setSiteError(null)
          }}
        >
          <SelectTrigger id="gateway-site" aria-invalid={!!siteError} className="w-full">
            <SelectValue placeholder="Chọn site" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sites.map((site) => (
                <SelectItem key={site.id} value={String(site.id)}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError>{siteError}</FieldError>
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="gateway-name">Tên gateway</FieldLabel>
        <Input id="gateway-name" aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <Field data-invalid={!!errors.macAddress}>
        <FieldLabel htmlFor="gateway-mac">MAC address</FieldLabel>
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
