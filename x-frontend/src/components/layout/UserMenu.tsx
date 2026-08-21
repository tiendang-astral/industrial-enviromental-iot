import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Eye, EyeOff, KeyRound, LogOut, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/patterns/FormDialog'
import { PasswordStrength } from '@/components/patterns/PasswordStrength'
import { getApiError } from '@/lib/apiError'
import { formatRoles } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/changePasswordSchema'
import { updateProfileSchema, type UpdateProfileFormValues } from '@/lib/updateProfileSchema'
import { useChangePasswordMutation } from '@/queries/useChangePasswordMutation'
import { useLogoutMutation } from '@/queries/useLogoutMutation'
import { useMeQuery } from '@/queries/useMeQuery'
import { useUpdateMeMutation } from '@/queries/useUpdateMeMutation'
import type { MeResponse } from '@/types/auth'

/** Menu tài khoản là menu bấm ít nhưng quan trọng — để mục cao hơn mặc định cho dễ trúng. */
const MENU_ITEM = 'h-10 gap-2.5 px-3 text-sm'

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
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  const displayName = me.fullName || me.username

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-10 gap-2 px-1.5 text-surface-deep-foreground',
              'hover:bg-surface-deep-hover hover:text-surface-deep-foreground',
              // Nút nằm trên khung tối ở cả 2 theme — ghim trạng thái mở về token khung, nếu không
              // ở chế độ sáng nó ăn --accent (nền nhạt, chữ đậm) và chìm hẳn chữ vai trò.
              'data-open:bg-surface-deep-active data-open:text-surface-deep-foreground',
              'data-[state=open]:bg-surface-deep-active data-[state=open]:text-surface-deep-foreground'
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-surface-deep-active text-surface-deep-foreground">
                <UserRound className="size-4" />
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-40 truncate text-sm font-medium">{displayName}</span>
              <span className="max-w-40 truncate text-xs text-surface-deep-muted">
                {formatRoles(me.authorities)}
              </span>
            </span>
            <ChevronDown className="size-4 text-surface-deep-muted" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem className={MENU_ITEM} onSelect={() => setProfileOpen(true)}>
              <UserRound />
              Thông tin tài khoản
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onSelect={() => setPasswordOpen(true)}>
              <KeyRound />
              Đổi mật khẩu
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} variant="destructive" onSelect={handleLogout}>
              <LogOut />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuGroup>
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
  const updateMeMutation = useUpdateMeMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: me.fullName ?? '', email: me.email ?? '' },
  })

  // me đến từ cache TanStack Query nên có thể về sau khi dialog đã mount — nạp lại giá trị
  // mỗi lần mở thay vì chỉ dựa vào defaultValues lúc khởi tạo form.
  useEffect(() => {
    if (open) {
      reset({ fullName: me.fullName ?? '', email: me.email ?? '' })
    }
  }, [open, me.fullName, me.email, reset])

  function onSubmit(values: UpdateProfileFormValues) {
    updateMeMutation.mutate(
      { fullName: values.fullName, email: values.email ? values.email : null },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đã lưu thông tin tài khoản')
        },
        onError: (error) => {
          const apiError = getApiError(error)
          if (apiError?.code === 'EMAIL_TAKEN') {
            setError('email', { type: 'server', message: apiError.message })
            return
          }
          toast.error(apiError?.message ?? 'Lưu thất bại, vui lòng thử lại')
        },
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thông tin tài khoản"
      submitLabel="Lưu"
      isPending={updateMeMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel htmlFor="profileUsername">Tên đăng nhập</FieldLabel>
        {/* Username là định danh đăng nhập đã nằm trong JWT đang phát hành — đổi được sẽ làm
            hỏng phiên hiện tại, nên chỉ hiện để đối chiếu. */}
        <Input id="profileUsername" value={me.username} readOnly disabled />
      </Field>

      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="profileFullName">Họ tên</FieldLabel>
        <Input
          id="profileFullName"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        <FieldError errors={[errors.fullName]} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="profileEmail">Email</FieldLabel>
        <Input
          id="profileEmail"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        <FieldError errors={[errors.email]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="profileRoles">Vai trò</FieldLabel>
        <Input id="profileRoles" value={formatRoles(me.authorities)} readOnly disabled />
      </Field>
    </FormDialog>
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
  const [showNew, setShowNew] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      setShowNew(false)
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
            setError('newPassword', { type: 'server', message })
          } else {
            setError('currentPassword', { type: 'server', message })
          }
        },
      }
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Đổi mật khẩu"
      submitLabel="Đổi mật khẩu"
      isPending={changePasswordMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.currentPassword}>
        <FieldLabel htmlFor="currentPassword">Mật khẩu hiện tại</FieldLabel>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...register('currentPassword')}
        />
        <FieldError errors={[errors.currentPassword]} />
      </Field>

      <Field data-invalid={!!errors.newPassword}>
        <FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowNew((value) => !value)}
            >
              {showNew ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <PasswordStrength password={watch('newPassword')} />
        <FieldError errors={[errors.newPassword]} />
      </Field>

      <Field data-invalid={!!errors.confirmPassword}>
        <FieldLabel htmlFor="confirmPassword">Nhập lại mật khẩu mới</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <FieldError errors={[errors.confirmPassword]} />
      </Field>
    </FormDialog>
  )
}
