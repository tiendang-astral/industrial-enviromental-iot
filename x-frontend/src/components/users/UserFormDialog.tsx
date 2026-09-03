import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { PasswordStrength } from '@/components/patterns/PasswordStrength'
import { UserRoleScopeField } from '@/components/users/UserRoleScopeField'
import { getApiErrorMessage } from '@/lib/apiError'
import { expandToDescendants, keepTopMost } from '@/lib/tenantNodeTree'
import { tenantUserSchema, type TenantUserFormValues } from '@/lib/tenantUserSchema'
import {
  useCreateTenantUserMutation,
  useUpdateTenantUserMutation,
} from '@/queries/useTenantUserMutations'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useTenantRolesQuery } from '@/queries/useTenantRolesQuery'
import type { TenantUser, UserScopePayload } from '@/types/tenantUser'

/** Backend nhận `null` cho email trống; form giữ chuỗi rỗng nên phải quy đổi ở ranh giới gửi đi. */
function toEmailPayload(email: string | undefined) {
  return email && email.trim() ? email.trim() : null
}

export function UserFormDialog({
  open,
  user,
  onOpenChange,
}: {
  open: boolean
  /** null = tạo mới. */
  user: TenantUser | null
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = !!user
  const { data: roles } = useTenantRolesQuery()
  const { data: nodes } = useTenantNodesQuery()
  const createMutation = useCreateTenantUserMutation()
  const updateMutation = useUpdateTenantUserMutation()

  // Một vai trò, một hoặc nhiều đơn vị. `selectedIds` là TẬP ĐẦY ĐỦ node được tick (mọi cấp) để ô
  // tick hiển thị đúng; lúc gửi đi mới rút về mức cao nhất.
  const [roleId, setRoleId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [scopeError, setScopeError] = useState<string | null>(null)

  const rootNodeId = nodes?.find((node) => node.parentId === null)?.id ?? null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TenantUserFormValues>({
    resolver: zodResolver(tenantUserSchema(isEdit)),
    defaultValues: { username: '', fullName: '', email: '', password: '' },
  })

  useEffect(() => {
    if (!open) return
    if (user) {
      reset({ username: user.username, fullName: user.fullName, email: user.email ?? '', password: '' })
      setRoleId(user.scopes[0]?.roleId ?? null)
      // `tenant_node_id = NULL` (full-access) hiện lên thành đơn vị gốc được tick — đơn vị gốc phủ
      // toàn bộ cây nên hai cách diễn đạt tương đương, mà người dùng chỉ phải hiểu một cách.
      setSelectedIds(
        expandToDescendants(
          user.scopes
            .map((scope) => scope.tenantNodeId ?? rootNodeId)
            .filter((id): id is number => id !== null),
          nodes ?? []
        )
      )
    } else {
      reset({ username: '', fullName: '', email: '', password: '' })
      // Mặc định vai trò thấp nhất — người tạo phải chủ động nâng quyền lên, không phải chủ động
      // hạ xuống.
      setRoleId(roles?.find((role) => role.value === 'VIEWER')?.id ?? roles?.[0]?.id ?? null)
      setSelectedIds([])
    }
    setScopeError(null)
  }, [open, user, roles, nodes, rootNodeId, reset])

  function submit(values: TenantUserFormValues) {
    if (roleId == null) {
      setScopeError('Vui lòng chọn vai trò')
      return
    }
    if (selectedIds.length === 0) {
      setScopeError('Chọn ít nhất một đơn vị')
      return
    }

    // Rút về mức cao nhất: cha đã tick thì con nằm trong phạm vi sẵn qua ltree, ghi thêm chỉ tạo
    // dòng thừa. Chọn đơn vị gốc = toàn tổ chức → ghi thẳng `tenant_node_id = NULL`, giữ đúng dấu
    // hiệu full-access backend đang dùng (ScopeService thoát sớm, không phải quét ltree) và để
    // scope NULL có sẵn trong DB round-trip qua form mà không bị đổi nghĩa.
    const topMost = keepTopMost(selectedIds, nodes ?? [])
    const scopes: UserScopePayload[] = topMost.includes(rootNodeId ?? -1)
      ? [{ roleId, tenantNodeId: null }]
      : topMost.map((tenantNodeId) => ({ roleId, tenantNodeId }))

    if (isEdit && user) {
      updateMutation.mutate(
        {
          id: user.id,
          payload: { fullName: values.fullName, email: toEmailPayload(values.email), scopes },
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Cập nhật người dùng thành công')
          },
          onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật thất bại')),
        }
      )
      return
    }

    createMutation.mutate(
      {
        username: (values.username ?? '').trim(),
        fullName: values.fullName,
        email: toEmailPayload(values.email),
        password: values.password ?? '',
        scopes,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã thêm người dùng')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo người dùng thất bại')),
      }
    )
  }

  if (!open) return null

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
      title={isEdit ? 'Sửa người dùng' : 'Thêm người dùng'}
      submitLabel={isEdit ? 'Lưu' : 'Tạo'}
      isPending={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit(submit)}
    >
      {!isEdit && (
        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="user-username" data-required>Tên đăng nhập</FieldLabel>
          <Input
            id="user-username"
            autoFocus
            autoComplete="off"
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          <FieldError errors={[errors.username]} />
        </Field>
      )}

      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="user-fullname" data-required>Họ tên</FieldLabel>
        <Input
          id="user-fullname"
          autoFocus={isEdit}
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        <FieldError errors={[errors.fullName]} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="user-email">Email</FieldLabel>
        <Input
          id="user-email"
          type="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        <FieldError errors={[errors.email]} />
      </Field>

      {!isEdit && (
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="user-password" data-required>Mật khẩu</FieldLabel>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <PasswordStrength password={watch('password') ?? ''} />
          <FieldError errors={[errors.password]} />
        </Field>
      )}

      <UserRoleScopeField
        roleId={roleId}
        selectedIds={selectedIds}
        roles={roles ?? []}
        nodes={nodes ?? []}
        error={scopeError ?? undefined}
        onRoleChange={(next) => {
          setRoleId(next)
          setScopeError(null)
        }}
        onSelectedIdsChange={(next) => {
          setSelectedIds(next)
          setScopeError(null)
        }}
      />
    </FormDialog>
  )
}
