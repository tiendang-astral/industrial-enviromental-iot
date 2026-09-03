import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Sao chép một giá trị định danh (địa chỉ MAC, chuỗi kết nối...). Đổi icon 1.5s sau khi copy —
 * clipboard không có phản hồi nào khác, không báo gì thì người dùng bấm lại vài lần.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  /** Mô tả cho screen reader, VD "Sao chép địa chỉ MAC AA:BB:...". */
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API cần secure context (https/localhost) — trên http thuần nó throw.
      toast.error('Trình duyệt không cho phép sao chép')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-6 text-muted-foreground', className)}
          onClick={copy}
        >
          {copied ? <Check className="text-ok" /> : <Copy />}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Đã sao chép' : 'Sao chép'}</TooltipContent>
    </Tooltip>
  )
}
