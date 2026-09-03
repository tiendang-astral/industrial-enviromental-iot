import { PlugZap, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { TestConnectionResult } from '@/types/externalSource'

/** Dấu tick tự vẽ khi kết nối thành công — xác nhận thao tác vừa chuyển trạng thái, không chỉ đổi màu. */
function DrawnCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M4 10.5 L8.2 14.5 L16 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="[stroke-dasharray:1] [stroke-dashoffset:1] animate-[draw-check_var(--motion-base)_var(--motion-ease)_forwards] motion-reduce:[stroke-dashoffset:0] motion-reduce:animate-none"
      />
    </svg>
  )
}

/**
 * Nút mang luôn trạng thái thay vì đặt kết quả ra một khối riêng: chưa thử / đang thử / được /
 * không được. Chi tiết chỉ hiện khi cần hành động — lỗi thì nêu lý do, quyền ghi thì nhắc.
 */
export function ConnectionTestRow({
  result,
  isPending,
  onTest,
  disabled,
}: {
  result: TestConnectionResult | null
  isPending: boolean
  onTest: () => void
  disabled?: boolean
}) {
  const ok = !isPending && result?.ok === true
  const failed = !isPending && result?.ok === false

  return (
    <div className="flex flex-col gap-2">
      <style>{`@keyframes draw-check { to { stroke-dashoffset: 0 } }`}</style>

      <Button
        type="button"
        variant="outline"
        onClick={onTest}
        disabled={isPending || disabled}
        aria-live="polite"
        className={cn(
          'w-fit min-w-[11.5rem] justify-center transition-colors duration-(--motion-base) ease-(--motion-ease)',
          ok && 'border-ok/40 bg-ok/10 text-ok hover:bg-ok/15 hover:text-ok disabled:opacity-100',
          failed && 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
        )}
      >
        {isPending && <Spinner data-icon="inline-start" />}
        {ok && <span data-icon="inline-start"><DrawnCheck /></span>}
        {failed && <X data-icon="inline-start" />}
        {!isPending && !result && <PlugZap data-icon="inline-start" />}

        {isPending ? 'Đang thử…' : ok ? 'Kết nối được' : failed ? 'Không kết nối được' : 'Kiểm tra kết nối'}
      </Button>

      {failed && result?.errorMessage && (
        <p className="text-sm text-destructive">{result.errorMessage}</p>
      )}

      {ok && result?.writable && (
        <p className="flex items-start gap-1.5 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Tài khoản có quyền ghi. Nên dùng tài khoản chỉ đọc.
        </p>
      )}
    </div>
  )
}
