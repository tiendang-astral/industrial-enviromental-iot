import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Strength {
  score: 0 | 1 | 2 | 3
  label: string
  className: string
}

/**
 * Đo độ mạnh theo độ dài và số nhóm ký tự — không dùng thư viện ngoài, không cho điểm giả
 * chính xác. Chỉ để người dùng biết mật khẩu vừa đặt yếu tới mức nào, không chặn submit
 * (ràng buộc thật nằm ở zod schema và backend).
 */
function measure(password: string): Strength | null {
  if (!password) return null

  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length
  const points = (password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0) + (groups >= 3 ? 2 : groups >= 2 ? 1 : 0)

  if (points >= 4) return { score: 3, label: 'Mạnh', className: 'bg-ok' }
  if (points >= 2) return { score: 2, label: 'Trung bình', className: 'bg-warning' }
  return { score: 1, label: 'Yếu', className: 'bg-critical' }
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => measure(password), [password])

  if (!strength) return null

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-[var(--motion-base)]',
              level <= strength.score ? strength.className : 'bg-border'
            )}
          />
        ))}
      </div>
      <span className="w-20 shrink-0 text-end text-xs text-muted-foreground">{strength.label}</span>
    </div>
  )
}
