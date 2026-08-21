import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Lock, LockOpen, Plus, Trash2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { FormDialog } from '@/components/patterns/FormDialog'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { getApiError, getApiErrorMessage } from '@/lib/apiError'
import {
  createPlatformUserSchema,
  type CreatePlatformUserFormValues,
} from '@/lib/schemas/createPlatformUserSchema'
import { useCreatePlatformUserMutation } from '@/queries/useCreatePlatformUserMutation'
import { useDeletePlatformUserMutation } from '@/queries/useDeletePlatformUserMutation'
import { useMeQuery } from '@/queries/useMeQuery'
import { usePlatformUsersQuery } from '@/queries/usePlatformUsersQuery'
import { useUpdatePlatformUserStatusMutation } from '@/queries/useUpdatePlatformUserStatusMutation'
import type { PlatformUser } from '@/types/platformUser'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN')
}

export default function PlatformUsersPage() {
  const { data: me } = useMeQuery()
  const { data: platformUsers, isLoading } = usePlatformUsersQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null)
  const [statusTarget, setStatusTarget] = useState<PlatformUser | null>(null)
  const createPlatformUserMutation = useCreatePlatformUserMutation()
  const updateStatusMutation = useUpdatePlatformUserStatusMutation()
  const deleteMutation = useDeletePlatformUserMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreatePlatformUserFormValues>({
    resolver: zodResolver(createPlatformUserSchema),
    defaultValues: { username: '', fullName: '', email: '', password: '' },
  })

  function openCreate(open: boolean) {
    setIsCreateOpen(open)
    if (!open) reset()
  }

  const onSubmit = (values: CreatePlatformUserFormValues) => {
    createPlatformUserMutation.mutate(
      { ...values, email: values.email || undefined },
      {
        onSuccess: () => {
          openCreate(false)
          toast.success('Tạo platform user thành công')
        },
        onError: (error) => {
          const apiError = getApiError(error)
          if (apiError?.code === 'USERNAME_TAKEN') {
            setError('username', { message: apiError.message })
          } else {
            toast.error(apiError?.message ?? 'Tạo platform user thất bại, vui lòng thử lại')
          }
        },
      }
    )
  }

  function confirmToggleStatus() {
    if (!statusTarget) return
    const nextStatus = statusTarget.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    updateStatusMutation.mutate(
      { id: statusTarget.id, status: nextStatus },
      {
        onSuccess: () => {
          setStatusTarget(null)
          toast.success(nextStatus === 'ACTIVE' ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'))
        },
      }
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa platform user thành công')
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại'))
      },
    })
  }

  const columns: DataTableColumn<PlatformUser>[] = [
    {
      key: 'username',
      header: 'Username',
      sortValue: (row) => row.username,
      cell: (row) => (
        <span className="flex items-center gap-2 font-medium">
          {row.username}
          {row.id === me?.id && (
            <Badge variant="outline" className="font-normal">
              bạn
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'fullName', header: 'Họ tên', sortValue: (row) => row.fullName, cell: (row) => row.fullName },
    {
      key: 'email',
      header: 'Email',
      sortValue: (row) => row.email,
      cell: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <span className="tabular text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Tác vụ',
      headerClassName: 'w-24 text-right',
      className: 'text-right',
      cell: (row) => {
        // Backend chặn tự khóa/tự xóa (SELF_ACTION_FORBIDDEN) — ẩn luôn nút để không bấm rồi mới báo lỗi.
        if (row.id === me?.id) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setStatusTarget(row)}
                >
                  {row.status === 'ACTIVE' ? <Lock /> : <LockOpen />}
                  <span className="sr-only">
                    {row.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {row.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 />
                  <span className="sr-only">Xóa tài khoản</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa tài khoản</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Người dùng"
        description="Tài khoản quản trị nền tảng, có quyền trên toàn bộ tenant."
        actions={
          <Button onClick={() => openCreate(true)}>
            <Plus data-icon="inline-start" />
            Tạo tài khoản
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={platformUsers}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        searchable={{
          placeholder: 'Tìm theo username, họ tên hoặc email',
          getText: (row) => `${row.username} ${row.fullName} ${row.email ?? ''}`,
        }}
        empty={
          <EmptyState
            icon={Users}
            title="Chưa có tài khoản quản trị nào"
            description="Tạo tài khoản System Admin để có người quản trị nền tảng."
            action={
              <Button onClick={() => openCreate(true)}>
                <Plus data-icon="inline-start" />
                Tạo tài khoản
              </Button>
            }
          />
        }
      />

      <FormDialog
        open={isCreateOpen}
        onOpenChange={openCreate}
        title="Tạo tài khoản quản trị"
        description="Tài khoản này có toàn quyền trên mọi tenant của nền tảng."
        submitLabel="Tạo tài khoản"
        isPending={createPlatformUserMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
      >
        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input id="username" aria-invalid={!!errors.username} {...register('username')} />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName">Họ tên</FieldLabel>
          <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
          <Input
            id="password"
            type="password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.status === 'ACTIVE' ? 'Khóa tài khoản này?' : 'Kích hoạt lại tài khoản?'}
        description={
          statusTarget?.status === 'ACTIVE'
            ? `"${statusTarget?.username}" sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được.`
            : `"${statusTarget?.username}" sẽ đăng nhập lại được ngay sau khi kích hoạt.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt'}
        destructive={statusTarget?.status === 'ACTIVE'}
        isPending={updateStatusMutation.isPending}
        onConfirm={confirmToggleStatus}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa tài khoản quản trị?"
        description={`"${deleteTarget?.username}" sẽ bị xóa và thu hồi toàn bộ phiên đăng nhập. Username sẽ được giải phóng để dùng lại. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa tài khoản"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
