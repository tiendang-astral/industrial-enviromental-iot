import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, LogOut, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getApiError } from '@/lib/apiError'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/changePasswordSchema'
import { useChangePasswordMutation } from '@/queries/useChangePasswordMutation'
import { useLogoutMutation } from '@/queries/useLogoutMutation'
import { useMeQuery } from '@/queries/useMeQuery'
import type { MeResponse } from '@/types/auth'

function getInitials(name: string) {
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

  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!me) {
    return null
  }

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true })
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(me.fullName || me.username)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <User />
            Thông tin tài khoản
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound />
            Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} me={me} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

function ProfileDialog({
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
          <DialogDescription>Thông tin đăng nhập hiện tại của bạn.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Tên đăng nhập</dt>
          <dd className="col-span-2 text-foreground">{me.username}</dd>
          <dt className="text-muted-foreground">Họ tên</dt>
          <dd className="col-span-2 text-foreground">{me.fullName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="col-span-2 text-foreground">{me.email}</dd>
          <dt className="text-muted-foreground">Vai trò</dt>
          <dd className="col-span-2 text-foreground">
            {me.authorities.length > 0 ? me.authorities.join(', ') : '—'}
          </dd>
          <dt className="text-muted-foreground">Tổ chức</dt>
          <dd className="col-span-2 text-foreground">{me.organizationPath ?? '—'}</dd>
        </dl>
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
  const changePasswordMutation = useChangePasswordMutation()

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset()
    }
    onOpenChange(next)
  }

  function onSubmit(values: ChangePasswordFormValues) {
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          handleOpenChange(false)
          toast.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại')
          navigate('/login', { replace: true })
        },
        onError: (error) => {
          const apiError = getApiError(error)
          const message = apiError?.message ?? 'Đổi mật khẩu thất bại, vui lòng thử lại'
          if (apiError?.code === 'SAME_AS_OLD_PASSWORD') {
            form.setError('newPassword', { type: 'server', message })
          } else {
            form.setError('currentPassword', { type: 'server', message })
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>
            Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại trên mọi thiết bị.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
