import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, Lock, LockOpen, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  return new Date(value).toLocaleString('vi-VN')
}

export default function TenantsPage() {
  const { data: tenants, isLoading } = useTenantsQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
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

  const onSubmit = (values: CreateTenantFormValues) => {
    createTenantMutation.mutate({ ...values, adminEmail: values.adminEmail || undefined }, {
      onSuccess: () => {
        setIsCreateOpen(false)
        reset()
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
    })
  }

  function handleToggleStatus(tenant: Tenant) {
    const nextStatus = tenant.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    updateStatusMutation.mutate(
      { id: tenant.id, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(nextStatus === 'ACTIVE' ? 'Đã kích hoạt tenant' : 'Đã khóa tenant')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'))
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tenant</h2>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) reset()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Tạo tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo tenant mới</DialogTitle>
              <DialogDescription>
                Tạo tenant và tài khoản Tenant Admin đầu tiên cho tenant này.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên tenant</Label>
                <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email tenant</Label>
                <Input id="email" aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="adminUsername">Username admin</Label>
                  <Input
                    id="adminUsername"
                    aria-invalid={!!errors.adminUsername}
                    {...register('adminUsername')}
                  />
                  {errors.adminUsername && (
                    <p className="text-sm text-destructive">{errors.adminUsername.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminFullName">Họ tên admin</Label>
                  <Input
                    id="adminFullName"
                    aria-invalid={!!errors.adminFullName}
                    {...register('adminFullName')}
                  />
                  {errors.adminFullName && (
                    <p className="text-sm text-destructive">{errors.adminFullName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Email admin</Label>
                  <Input
                    id="adminEmail"
                    aria-invalid={!!errors.adminEmail}
                    {...register('adminEmail')}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">Mật khẩu admin</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  aria-invalid={!!errors.adminPassword}
                  {...register('adminPassword')}
                />
                {errors.adminPassword && (
                  <p className="text-sm text-destructive">{errors.adminPassword.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending ? 'Đang tạo...' : 'Tạo tenant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên tenant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="w-24">Tác vụ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Đang tải...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && tenants?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Chưa có tenant nào
              </TableCell>
            </TableRow>
          )}
          {tenants?.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell>{tenant.email}</TableCell>
              <TableCell>
                <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'outline'}>
                  {tenant.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(tenant.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-7" title="Xem chi tiết" asChild>
                    <Link to={`/tenants/${tenant.id}`}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title={tenant.status === 'ACTIVE' ? 'Khóa tenant' : 'Kích hoạt tenant'}
                    disabled={updateStatusMutation.isPending}
                    onClick={() => handleToggleStatus(tenant)}
                  >
                    {tenant.status === 'ACTIVE' ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
