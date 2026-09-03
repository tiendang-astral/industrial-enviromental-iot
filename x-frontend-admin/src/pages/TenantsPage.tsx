import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Lock, LockOpen, Plus } from 'lucide-react'
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
  const navigate = useNavigate()
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
          toast.success('Tạo tổ chức thành công')
        },
        onError: (error) => {
          const apiError = getApiError(error)
          if (apiError?.code === 'USERNAME_TAKEN') {
            setError('adminUsername', { message: apiError.message })
          } else {
            toast.error(apiError?.message ?? 'Tạo tổ chức thất bại, vui lòng thử lại')
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
          toast.success(nextStatus === 'ACTIVE' ? 'Đã kích hoạt tổ chức' : 'Đã khóa tổ chức')
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
      header: 'Tên tổ chức',
      filter: { type: 'text', placeholder: 'Tìm tên', getValue: (row) => row.name },
      cell: (row) => (
        <Link to={`/tenants/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      filter: { type: 'text', placeholder: 'Tìm email', getValue: (row) => row.email },
      cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
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
      cell: (row) => <span className="tabular text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Hành động',
      headerClassName: 'w-16 text-right',
      className: 'text-right',
      cell: (row) => (
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
                {row.status === 'ACTIVE' ? 'Khóa tổ chức' : 'Kích hoạt tổ chức'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {row.status === 'ACTIVE' ? 'Khóa tổ chức' : 'Kích hoạt tổ chức'}
          </TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tổ chức"
        description="Danh sách tổ chức đang dùng nền tảng và trạng thái truy cập của họ."
        actions={
          <Button onClick={() => openCreate(true)}>
            <Plus data-icon="inline-start" />
            Tạo tổ chức
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={tenants}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        showIndex
        onRowClick={(row) => navigate(`/tenants/${row.id}`)}
        empty={
          <EmptyState
            icon={Building2}
            title="Chưa có tổ chức nào"
            description="Tạo tổ chức đầu tiên để bắt đầu cấp quyền sử dụng nền tảng."
          />
        }
      />

      <FormDialog
        open={isCreateOpen}
        onOpenChange={openCreate}
        title="Tạo tổ chức mới"
        description="Tạo tổ chức và tài khoản quản trị viên đầu tiên cho tổ chức này."
        submitLabel="Tạo tổ chức"
        isPending={createTenantMutation.isPending}
        onSubmit={handleSubmit(onSubmit)}
      >
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Tên tổ chức</FieldLabel>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email tổ chức</FieldLabel>
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
        title={statusTarget?.status === 'ACTIVE' ? 'Khóa tổ chức này?' : 'Kích hoạt lại tổ chức này?'}
        description={
          statusTarget?.status === 'ACTIVE'
            ? `Bạn có chắc chắn muốn khóa tổ chức "${statusTarget?.name}"? Người dùng của tổ chức này sẽ không thể đăng nhập.`
            : `Bạn có chắc chắn muốn kích hoạt lại tổ chức "${statusTarget?.name}"? Người dùng của tổ chức này sẽ đăng nhập lại được.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Khóa tổ chức' : 'Kích hoạt'}
        destructive={statusTarget?.status === 'ACTIVE'}
        isPending={updateStatusMutation.isPending}
        onConfirm={confirmToggleStatus}
      />
    </div>
  )
}
