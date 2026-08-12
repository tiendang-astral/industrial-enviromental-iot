import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
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
import { getApiError } from '@/lib/apiError'
import {
  createPlatformUserSchema,
  type CreatePlatformUserFormValues,
} from '@/lib/schemas/createPlatformUserSchema'
import { useCreatePlatformUserMutation } from '@/queries/useCreatePlatformUserMutation'
import { usePlatformUsersQuery } from '@/queries/usePlatformUsersQuery'

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN')
}

export default function PlatformUsersPage() {
  const { data: platformUsers, isLoading } = usePlatformUsersQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const createPlatformUserMutation = useCreatePlatformUserMutation()

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

  const onSubmit = (values: CreatePlatformUserFormValues) => {
    createPlatformUserMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false)
        reset()
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
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform User</h2>
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
              Tạo platform user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo platform user mới</DialogTitle>
              <DialogDescription>
                Tạo tài khoản System Admin mới cho platform.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  aria-invalid={!!errors.username}
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Họ tên</Label>
                <Input
                  id="fullName"
                  aria-invalid={!!errors.fullName}
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createPlatformUserMutation.isPending}>
                  {createPlatformUserMutation.isPending ? 'Đang tạo...' : 'Tạo platform user'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày tạo</TableHead>
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
          {!isLoading && platformUsers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Chưa có platform user nào
              </TableCell>
            </TableRow>
          )}
          {platformUsers?.map((platformUser) => (
            <TableRow key={platformUser.id}>
              <TableCell className="font-medium">{platformUser.username}</TableCell>
              <TableCell>{platformUser.fullName}</TableCell>
              <TableCell>{platformUser.email}</TableCell>
              <TableCell>
                <Badge variant={platformUser.status === 'ACTIVE' ? 'default' : 'outline'}>
                  {platformUser.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(platformUser.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
