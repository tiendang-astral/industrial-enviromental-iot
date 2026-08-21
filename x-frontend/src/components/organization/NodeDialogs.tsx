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
import { nodeNameSchema, type NodeNameFormValues } from '@/lib/tenantNodeSchema'
import { NEXT_TYPE, NODE_LABEL } from '@/lib/tenantNodeLabels'
import { useCreateTenantNodeMutation } from '@/queries/useCreateTenantNodeMutation'
import { useMoveTenantNodeMutation } from '@/queries/useMoveTenantNodeMutation'
import { useRenameTenantNodeMutation } from '@/queries/useRenameTenantNodeMutation'
import type { NodeType, TenantNode } from '@/types/tenantNode'

export function CreateNodeDialog({
  parent,
  onOpenChange,
}: {
  parent: TenantNode | null
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateTenantNodeMutation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (parent) reset({ name: '' })
  }, [parent, reset])

  const childType = parent ? NEXT_TYPE[parent.nodeType] : undefined
  if (!parent || !childType) return null

  function onSubmit(values: NodeNameFormValues) {
    if (!parent || !childType) return
    createMutation.mutate(
      { parentId: parent.id, nodeType: childType, name: values.name },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success(`Đã thêm ${NODE_LABEL[childType].toLowerCase()}`)
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo node thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Thêm ${NODE_LABEL[childType].toLowerCase()}`}
      description={`Đơn vị mới sẽ nằm trong "${parent.name}".`}
      submitLabel="Tạo"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="node-name">Tên</FieldLabel>
        <Input id="node-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}

export function RenameNodeDialog({
  node,
  onOpenChange,
}: {
  node: TenantNode | null
  onOpenChange: (open: boolean) => void
}) {
  const renameMutation = useRenameTenantNodeMutation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    values: { name: node?.name ?? '' },
  })

  if (!node) return null

  function onSubmit(values: NodeNameFormValues) {
    if (!node) return
    renameMutation.mutate(
      { id: node.id, payload: { name: values.name } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đổi tên thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Đổi tên thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Đổi tên"
      description={
        node.nodeType === 'TENANT_ROOT'
          ? 'Đổi tên đơn vị gốc cũng đổi luôn tên tenant hiển thị trên toàn hệ thống.'
          : undefined
      }
      submitLabel="Lưu"
      isPending={renameMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="rename-node">Tên</FieldLabel>
        <Input id="rename-node" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}

export function MoveNodeDialog({
  node,
  allNodes,
  onOpenChange,
}: {
  node: TenantNode | null
  allNodes: TenantNode[]
  onOpenChange: (open: boolean) => void
}) {
  const moveMutation = useMoveTenantNodeMutation()
  const [newParentId, setNewParentId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (node) {
      setNewParentId('')
      setError(null)
    }
  }, [node])

  if (!node) return null

  // Cấp cha hợp lệ là cấp ngay trên node hiện tại — backend validate lại thứ bậc
  // TENANT_ROOT → BRANCH → PRODUCTION_AREA → SITE nên chỉ liệt kê đúng loại đó.
  const requiredParentType = Object.entries(NEXT_TYPE).find(
    ([, child]) => child === node.nodeType
  )?.[0] as NodeType | undefined
  const candidates = requiredParentType
    ? allNodes.filter((item) => item.nodeType === requiredParentType && item.id !== node.id)
    : []

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!node) return
    if (!newParentId) {
      setError('Vui lòng chọn đơn vị cha mới')
      return
    }
    moveMutation.mutate(
      { id: node.id, payload: { newParentId: Number(newParentId) } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Di chuyển thành công')
        },
        onError: (mutationError) =>
          toast.error(getApiErrorMessage(mutationError, 'Di chuyển thất bại')),
      }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Di chuyển "${node.name}"`}
      description="Toàn bộ đơn vị con bên dưới sẽ được chuyển theo."
      submitLabel="Di chuyển"
      isPending={moveMutation.isPending}
      onSubmit={onSubmit}
    >
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="move-parent">
          {requiredParentType ? `${NODE_LABEL[requiredParentType]} mới` : 'Đơn vị cha mới'}
        </FieldLabel>
        <Select
          value={newParentId}
          onValueChange={(value) => {
            setNewParentId(value)
            setError(null)
          }}
        >
          <SelectTrigger id="move-parent" aria-invalid={!!error} className="w-full">
            <SelectValue placeholder="Chọn đơn vị cha" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={String(candidate.id)}>
                  {candidate.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError>{error}</FieldError>
      </Field>
    </FormDialog>
  )
}
