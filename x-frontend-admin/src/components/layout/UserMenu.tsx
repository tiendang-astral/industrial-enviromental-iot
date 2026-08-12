import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, LogOut, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiError } from '@/lib/apiError'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/schemas/changePasswordSchema'
import { useChangePasswordMutation } from '@/queries/useChangePasswordMutation'
import { useLogoutMutation } from '@/queries/useLogoutMutation'
import { useMeQuery } from '@/queries/useMeQuery'
import { useAuthStore } from '@/stores/useAuthStore'
import type { MeResponse } from '@/types/auth'

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

export function UserMenu() {
  const navigate = useNavigate()
  const { data: me } = useMeQuery()
  const logoutMutation = useLogoutMutation()

  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true })
      },
    })
  }

  if (!me) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
              <AvatarFallback>{initials(me.fullName || me.username)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{me.fullName}</span>
            <span className="text-xs text-muted-foreground">{me.username}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsInfoOpen(true)}>
            <UserRound />
            Thông tin tài khoản
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsPasswordOpen(true)}>
            <KeyRound />
            Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountInfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} me={me} />
      <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{value}</span>
    </div>
  )
}

function AccountInfoDialog({
  open,
  onOpenChange,
  me,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: MeResponse
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thông tin tài khoản</DialogTitle>
          <DialogDescription>Thông tin tài khoản đăng nhập hiện tại.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <InfoRow label="Username" value={me.username} />
          <InfoRow label="Họ tên" value={me.fullName} />
          <InfoRow label="Email" value={me.email} />
          <InfoRow label="Loại tài khoản" value={me.type} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)
  const changePasswordMutation = useChangePasswordMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const onSubmit = (values: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          onOpenChange(false)
          reset()
          toast.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại')
          clearSession()
          navigate('/login', { replace: true })
        },
        onError: (error) => {
          const apiError = getApiError(error)
          if (apiError?.code === 'INVALID_CURRENT_PASSWORD') {
            setError('currentPassword', { message: apiError.message })
          } else {
            toast.error(apiError?.message ?? 'Đổi mật khẩu thất bại, vui lòng thử lại')
          }
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>
            Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmNewPassword}
              {...register('confirmNewPassword')}
            />
            {errors.confirmNewPassword && (
              <p className="text-sm text-destructive">{errors.confirmNewPassword.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
