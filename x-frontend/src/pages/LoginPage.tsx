import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { loginSchema, type LoginFormValues } from '@/lib/loginSchema'
import { getApiErrorMessage } from '@/lib/apiError'
import { useLoginMutation } from '@/queries/useLoginMutation'

export default function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
    })
  }

  // Sai tài khoản/mật khẩu là lỗi của cả cặp, không riêng field nào, nên hiện ở đầu form.
  const serverError = loginMutation.isError
    ? getApiErrorMessage(loginMutation.error, 'Đăng nhập thất bại, vui lòng thử lại')
    : null

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
      <BackdropGrid />

      <div className="relative flex w-full max-w-[26rem] flex-col gap-5">
        <Card className="border-border bg-surface shadow-lg shadow-black/5 [--card-spacing:--spacing(6)]">
          <CardHeader className="justify-items-center gap-1 pb-2 text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Activity className="size-6" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">Astralx IoT</CardTitle>
            <CardDescription>
              Nền tảng quản lý và giám sát dữ liệu cảm biến tập trung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <FieldGroup>
                <Field data-invalid={!!errors.username}>
                  <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
                  <Input
                    id="username"
                    className="h-11"
                    autoComplete="username"
                    autoFocus
                    aria-invalid={!!errors.username}
                    {...register('username')}
                  />
                  <FieldError errors={[errors.username]} />
                </Field>

                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                  <InputGroup className="h-11">
                    <InputGroupInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      {...register('password')}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={[errors.password]} />
                </Field>
              </FieldGroup>

              {/* Ẩn icon khi đang chạy để không đứng cạnh Spinner của LoadingButton. */}
              <LoadingButton
                type="submit"
                size="lg"
                className="h-11 w-full text-sm"
                isPending={loginMutation.isPending}
              >
                {!loginMutation.isPending && <LogIn data-icon="inline-start" />}
                Đăng nhập
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Lưới mảnh mờ dần ra rìa — tạo chiều sâu cho nền mà không kéo sự chú ý khỏi form. */
function BackdropGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 46% 44% at 50% 46%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 46% 44% at 50% 46%, black, transparent)',
        opacity: 0.45,
      }}
    />
  )
}
