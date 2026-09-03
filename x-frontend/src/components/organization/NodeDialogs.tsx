import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { getApiErrorMessage } from '@/lib/apiError'
import { nodeNameSchema, type NodeNameFormValues } from '@/lib/tenantNodeSchema'
import { NEXT_TYPE, NODE_LABEL } from '@/lib/tenantNodeLabels'
import { useCreateTenantNodeMutation } from '@/queries/useCreateTenantNodeMutation'
import { useMoveTenantNodeMutation } from '@/queries/useMoveTenantNodeMutation'
import { useRenameTenantNodeMutation } from '@/queries/useRenameTenantNodeMutation'
import type { NodeType, TenantNode } from '@/types/tenantNode'

/** Giá trị `value` của mục "Không có" trong Select — Radix cấm SelectItem có value rỗng. */
const NO_PARENT = '__none__'

/** Cấp cha hợp lệ ngay TRÊN một cấp — nghịch đảo của NEXT_TYPE. */
function parentTypeOf(type: NodeType): NodeType | undefined {
  return Object.entries(NEXT_TYPE).find(([, child]) => child === type)?.[0] as NodeType | undefined
}

/** Đơn vị còn nhận thêm con được: chưa phải cấp lá và chưa bị tắt (backend chặn tạo dưới node đã tắt). */
function canHaveChildren(node: TenantNode) {
  return !!NEXT_TYPE[node.nodeType] && node.enabled
}

export function CreateNodeDialog({
  open,
  parent,
  allNodes,
  onOpenChange,
}: {
  open: boolean
  /** null = người dùng tự chọn đơn vị cha trong dialog (nút "Thêm tổ chức" ở đầu trang). */
  parent: TenantNode | null
  allNodes: TenantNode[]
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateTenantNodeMutation()
  const [parentId, setParentId] = useState(NO_PARENT)
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
    if (open) {
      reset({ name: '' })
      setParentId(NO_PARENT)
    }
  }, [open, reset])

  const rootNode = allNodes.find((node) => node.nodeType === 'TENANT_ROOT')
  const isParentFixed = !!parent

  const effectiveParent = isParentFixed
    ? parent
    : parentId === NO_PARENT
      ? rootNode
      : allNodes.find((node) => String(node.id) === parentId)

  const childType = effectiveParent ? NEXT_TYPE[effectiveParent.nodeType] : undefined

  function onSubmit(values: NodeNameFormValues) {
    if (!effectiveParent || !childType) return
    createMutation.mutate(
      { parentId: effectiveParent.id, nodeType: childType, name: values.name },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success(`Đã thêm ${NODE_LABEL[childType].toLowerCase()}`)
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo đơn vị thất bại')),
      }
    )
  }

  if (!open) return null

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={
        isParentFixed && childType ? `Thêm ${NODE_LABEL[childType].toLowerCase()}` : 'Thêm tổ chức'
      }
      submitLabel="Tạo"
      isPending={createMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      {!isParentFixed && (
        <Field>
          <FieldLabel htmlFor="create-parent" data-required>
            Chọn tổ chức cha
          </FieldLabel>
          {/* Cấp lá và đơn vị đã tắt vẫn hiện nhưng khoá — backend chặn tạo con dưới chúng. */}
          <TenantNodePicker
            id="create-parent"
            mode="single"
            nodes={allNodes}
            selectable={canHaveChildren}
            value={parentId === NO_PARENT ? (rootNode?.id ?? null) : Number(parentId)}
            onChange={(id) => setParentId(String(id))}
          />
        </Field>
      )}

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="node-name" data-required>Tên</FieldLabel>
        <Input id="node-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  )
}

/**
 * Sửa đơn vị: đổi tên VÀ đổi đơn vị cha trong cùng một form. Trước đây "Di chuyển" là một nút/dialog
 * riêng, nhưng với người dùng thì đổi chỗ một chi nhánh cũng chỉ là sửa thuộc tính của nó — tách ra
 * thành hành động riêng làm hàng bảng đầy nút mà không thêm khả năng gì.
 */
export function EditNodeDialog({
  node,
  allNodes,
  onOpenChange,
}: {
  node: TenantNode | null
  allNodes: TenantNode[]
  onOpenChange: (open: boolean) => void
}) {
  const renameMutation = useRenameTenantNodeMutation()
  const moveMutation = useMoveTenantNodeMutation()
  const [parentId, setParentId] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    values: { name: node?.name ?? '' },
  })

  useEffect(() => {
    if (node) setParentId(node.parentId === null ? '' : String(node.parentId))
  }, [node])

  if (!node) return null

  const requiredParentType = parentTypeOf(node.nodeType)
  const canBeParent = (item: TenantNode) =>
    item.nodeType === requiredParentType && item.id !== node.id && item.enabled

  /*
   * Chỉ hiện ô chọn cha khi thật sự có lựa chọn. Chi nhánh chẳng hạn: cha bắt buộc là TENANT_ROOT
   * mà tenant chỉ có đúng một node gốc, nên ô chọn luôn có mỗi một mục — bắt người dùng mở ra để
   * chọn lại đúng thứ đang có sẵn.
   */
  const parentChoiceCount = allNodes.filter(canBeParent).length
  const showParentPicker = !!requiredParentType && parentChoiceCount > 1

  const isPending = renameMutation.isPending || moveMutation.isPending

  async function onSubmit(values: NodeNameFormValues) {
    if (!node) return
    const nameChanged = values.name !== node.name
    const parentChanged = parentId !== '' && Number(parentId) !== node.parentId

    if (!nameChanged && !parentChanged) {
      onOpenChange(false)
      return
    }

    try {
      if (nameChanged) await renameMutation.mutateAsync({ id: node.id, payload: { name: values.name } })
      if (parentChanged) {
        await moveMutation.mutateAsync({ id: node.id, payload: { newParentId: Number(parentId) } })
      }
      onOpenChange(false)
      toast.success('Cập nhật thành công')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Cập nhật thất bại'))
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Sửa ${NODE_LABEL[node.nodeType].toLowerCase()}`}
      description={
        node.nodeType === 'TENANT_ROOT'
          ? 'Đổi tên đơn vị gốc cũng đổi luôn tên tenant hiển thị trên toàn hệ thống.'
          : undefined
      }
      submitLabel="Lưu"
      isPending={isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="edit-node-name" data-required>Tên</FieldLabel>
        <Input id="edit-node-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      {showParentPicker && (
        <Field>
          <FieldLabel htmlFor="edit-node-parent" data-required>
            Chọn tổ chức cha
          </FieldLabel>
          {/* Chỉ đúng cấp cha hợp lệ mới chọn được — ràng buộc cấp cũng tự loại khả năng chọn phải
              con cháu của chính nó, vì con cháu luôn ở cấp thấp hơn. */}
          <TenantNodePicker
            id="edit-node-parent"
            mode="single"
            nodes={allNodes}
            selectable={canBeParent}
            value={parentId ? Number(parentId) : null}
            onChange={(id) => setParentId(String(id))}
          />
        </Field>
      )}
    </FormDialog>
  )
}
