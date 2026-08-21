import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Eye, Lock, LockOpen, Plus } from 'lucide-react'
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
  createTenantSchema,
  type CreateTenantFormValues,
} from '@/lib/schemas/createTenantSchema'
import { useCreateTenantMutation } from '@/queries/useCreateTenantMutation'
import { useTenantsQuery } from '@/queries/useTenantsQuery'
import { useUpdateTenantStatusMutation } from '@/queries/useUpdateTenantStatusMutation'
import type { Tenant } from '@/types/tenant'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN')
}

export default function TenantsPage() {
  const { data: tenants, isLoading } = useTenantsQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<Tenant | null>(null)
  const createTenantMutation = useCreateTenantMutation()
  const updateStatusMutation = useUpdateTenantStatusMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      email: '',
      adminUsername: '',
      adminFullName: '',
      adminEmail: '',
      adminPassword: '',
    },
  })

  function openCreate(open: boolean) {
    setIsCreateOpen(open)
    if (!open) reset()
  }

  const onSubmit = (values: CreateTenantFormValues) => {
    createTenantMutation.mutate(
      { ...values, adminEmail: values.adminEmail || undefined },
      {
        onSuccess: () => {
          openCreate(false)
          toast.success('Tạo tenant thành công')
        },
        onError: (error) => {
          const apiError = getApiError(error)
          if (apiError?.code === 'USERNAME_TAKEN') {
            setError('adminUsername', { message: apiError.message })
          } else {
            toast.error(apiError?.message ?? 'Tạo tenant thất bại, vui lòng thử lại')
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
          toast.success(nextStatus === 'ACTIVE' ? 'Đã kích hoạt tenant' : 'Đã khóa tenant')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'))
        },
      }
    )
  }

  const columns: DataTableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Tên tenant',
      sortValue: (row) => row.name,
      cell: (row) => (
        <Link to={`/tenants/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortValue: (row) => row.email,
      cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
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
      cell: (row) => <span className="tabular text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Tác vụ',
      headerClassName: 'w-24 text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" asChild>
                <Link to={`/tenants/${row.id}`}>
                  <Eye />
                  <span className="sr-only">Xem chi tiết</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xem chi tiết</TooltipContent>
          </Tooltip>
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
                  {row.status === 'ACTIVE' ? 'Khóa tenant' : 'Kích hoạt tenant'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {row.status === 'ACTIVE' ? 'Khóa tenant' : 'Kích hoạt tenant'}
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tổ chức"
        description="Danh sách tenant đang dùng nền tảng và trạng thái truy cập của họ."
        actions={
          <Button onClick={() => openCreate(true)}>
            <Plus data-icon="inline-start" />
            Tạo tenant
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={tenants}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        searchable={{
          placeholder: 'Tìm theo tên hoặc email',
          getText: (row) => `${row.name} ${row.email}`,
        }}
        empty={
          <EmptyState
            icon={Building2}
            title="Chưa có tenant nào"
            description="Tạo tenant đầu tiên để bắt đầu cấp quyền sử dụng nền tảng."
            action={
              <Button onClick={() => openCreate(true)}>
                <Plus data-icon="inline-start" />
                Tạo tenant
              </Button>
            }
          />
        }
      />

      <FormDialog
        open={isCreateOpen}
        onOpenChange={openCreate}
        title="Tạo tenant mới"
        description="Tạo tenant và tài khoản Tenant Admin đầu tiên cho tenant này."
        submitLabel="Tạo tenant"
        isPending={createTenantMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
      >
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Tên tenant</FieldLabel>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email tenant</FieldLabel>
          <Input id="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.adminUsername}>
          <FieldLabel htmlFor="adminUsername">Username admin</FieldLabel>
          <Input
            id="adminUsername"
            aria-invalid={!!errors.adminUsername}
            {...register('adminUsername')}
          />
          <FieldError errors={[errors.adminUsername]} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.adminFullName}>
            <FieldLabel htmlFor="adminFullName">Họ tên admin</FieldLabel>
            <Input
              id="adminFullName"
              aria-invalid={!!errors.adminFullName}
              {...register('adminFullName')}
            />
            <FieldError errors={[errors.adminFullName]} />
          </Field>
          <Field data-invalid={!!errors.adminEmail}>
            <FieldLabel htmlFor="adminEmail">Email admin</FieldLabel>
            <Input
              id="adminEmail"
              aria-invalid={!!errors.adminEmail}
              {...register('adminEmail')}
            />
            <FieldError errors={[errors.adminEmail]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.adminPassword}>
          <FieldLabel htmlFor="adminPassword">Mật khẩu admin</FieldLabel>
          <Input
            id="adminPassword"
            type="password"
            aria-invalid={!!errors.adminPassword}
            {...register('adminPassword')}
          />
          <FieldError errors={[errors.adminPassword]} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.status === 'ACTIVE' ? 'Khóa tenant này?' : 'Kích hoạt lại tenant?'}
        description={
          statusTarget?.status === 'ACTIVE'
            ? `Toàn bộ người dùng của "${statusTarget?.name}" sẽ không đăng nhập được và phiên đang mở sẽ bị thu hồi. Dữ liệu cảm biến vẫn tiếp tục được thu thập.`
            : `Người dùng của "${statusTarget?.name}" sẽ đăng nhập lại được ngay sau khi kích hoạt.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Khóa tenant' : 'Kích hoạt'}
        destructive={statusTarget?.status === 'ACTIVE'}
        isPending={updateStatusMutation.isPending}
        onConfirm={confirmToggleStatus}
      />
    </div>
  )
}
