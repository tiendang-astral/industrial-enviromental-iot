import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Lock, LockOpen, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { roleLabel } from '@/lib/roleLabels'
import { useTenantRolesQuery } from '@/queries/useTenantRolesQuery'
import { useTenantUsersQuery } from '@/queries/useTenantUsersQuery'
import {
  useDeleteTenantUserMutation,
  useUpdateTenantUserStatusMutation,
} from '@/queries/useTenantUserMutations'
import { useAuthStore } from '@/stores/useAuthStore'
import type { TenantUser } from '@/types/tenantUser'

/** Một user có thể giữ nhiều vai trò ở nhiều phạm vi — gộp lại để lọc/tìm trên cùng một chuỗi. */
function roleValuesOf(user: TenantUser) {
  return user.scopes.map((scope) => scope.roleValue).filter(Boolean).join(' ')
}

function scopeLabel(user: TenantUser) {
  if (user.scopes.length === 0) return '—'
  return user.scopes
    .map((scope) => scope.tenantNodeName ?? 'Toàn tổ chức')
    .join(', ')
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user)
  const { data: users, isLoading } = useTenantUsersQuery()
  const { data: roles } = useTenantRolesQuery()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TenantUser | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<TenantUser | null>(null)
  const [lockTarget, setLockTarget] = useState<TenantUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null)

  const statusMutation = useUpdateTenantUserStatusMutation()
  const deleteMutation = useDeleteTenantUserMutation()

  /** Backend chặn tự khoá/xoá chính mình bằng SELF_ACTION_FORBIDDEN — chặn luôn ở UI cho khỏi bấm hụt. */
  const isSelf = (user: TenantUser) => user.id === currentUser?.id

  function setStatus(user: TenantUser, status: 'ACTIVE' | 'LOCKED', onDone?: () => void) {
    statusMutation.mutate(
      { id: user.id, payload: { status } },
      {
        onSuccess: () => {
          onDone?.()
          toast.success(status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại')),
      }
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa người dùng thành công')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại')),
    })
  }

  const columns: DataTableColumn<TenantUser>[] = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      filter: { type: 'text', placeholder: 'Tìm kiếm', getValue: (row) => row.username },
      cell: (row) => <span className="font-medium">{row.username}</span>,
    },
    {
      key: 'fullName',
      header: 'Họ tên',
      filter: { type: 'text', placeholder: 'Tìm kiếm', getValue: (row) => row.fullName },
      cell: (row) => row.fullName,
    },
    {
      key: 'email',
      header: 'Email',
      className: 'text-muted-foreground',
      cell: (row) => row.email ?? '—',
    },
    {
      key: 'role',
      header: 'Vai trò',
      filter: {
        type: 'select',
        placeholder: 'Vai trò',
        // Khớp "có chứa" chứ không so bằng: một user nhiều vai trò vẫn phải hiện ra khi lọc
        // theo bất kỳ vai trò nào nó đang giữ.
        getValue: roleValuesOf,
        options: (roles ?? []).map((role) => ({ value: role.value, label: roleLabel(role.value) })),
      },
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          {row.scopes.length === 0 ? (
            <span className="text-muted-foreground">Chưa phân quyền</span>
          ) : (
            row.scopes.map((scope) => (
              <EnumBadge key={scope.id}>{roleLabel(scope.roleValue)}</EnumBadge>
            ))
          )}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Phạm vi',
      className: 'text-muted-foreground',
      cell: scopeLabel,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Trạng thái',
        getValue: (row) => row.status,
        options: [
          { value: 'ACTIVE', label: 'Đang hoạt động' },
          { value: 'LOCKED', label: 'Đã khóa' },
        ],
      },
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      headerClassName: 'text-right',
      className: 'text-muted-foreground tabular text-right',
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Hành động',
      headerClassName: 'w-52 text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditTarget(row)}
          >
            <Pencil data-icon="inline-start" />
            Sửa
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setPasswordTarget(row)}
              >
                <KeyRound />
                <span className="sr-only">Đặt lại mật khẩu cho {row.username}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Đặt lại mật khẩu</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isSelf(row) || statusMutation.isPending}
                onClick={() =>
                  row.status === 'ACTIVE' ? setLockTarget(row) : setStatus(row, 'ACTIVE')
                }
              >
                {row.status === 'ACTIVE' ? <Lock /> : <LockOpen />}
                <span className="sr-only">
                  {row.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} tài khoản {row.username}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSelf(row)
                ? 'Không thể khóa chính mình'
                : row.status === 'ACTIVE'
                  ? 'Khóa tài khoản'
                  : 'Mở khóa tài khoản'}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            disabled={isSelf(row)}
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 data-icon="inline-start" />
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Người dùng"
        description="Danh sách người dùng của công ty."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm người dùng
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={users}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon={Users}
            title="Chưa có người dùng nào"
            description="Thêm tài khoản cho kỹ thuật viên và nhân viên để họ theo dõi dashboard và xử lý cảnh báo."
          />
        }
      />

      <UserFormDialog open={isCreateOpen} user={null} onOpenChange={setIsCreateOpen} />
      <UserFormDialog
        open={!!editTarget}
        user={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <ResetPasswordDialog
        user={passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
      />

      <ConfirmDialog
        open={!!lockTarget}
        onOpenChange={(open) => !open && setLockTarget(null)}
        title="Khóa tài khoản này?"
        question={
          <>
            Bạn có chắc chắn muốn khóa{' '}
            <span className="font-semibold">&ldquo;{lockTarget?.username}&rdquo;</span>?
          </>
        }
        description="Người dùng sẽ không đăng nhập được và mọi phiên đang mở bị thu hồi ngay. Dữ liệu và phân quyền vẫn giữ nguyên, mở khóa lại được bất cứ lúc nào."
        confirmLabel="Khóa tài khoản"
        isPending={statusMutation.isPending}
        onConfirm={() => lockTarget && setStatus(lockTarget, 'LOCKED', () => setLockTarget(null))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa người dùng này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.username}&rdquo;</span>?
          </>
        }
        description="Tài khoản và toàn bộ phân quyền của người này sẽ bị gỡ, mọi phiên đang mở bị thu hồi. Thao tác bị chặn nếu đây là quản trị viên đang hoạt động cuối cùng của tenant."
        confirmLabel="Xóa người dùng"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
