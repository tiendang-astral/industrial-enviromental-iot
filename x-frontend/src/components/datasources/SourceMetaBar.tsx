import { AlertTriangle, Lock, Pencil, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CopyButton } from '@/components/patterns/CopyButton'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime } from '@/lib/datetime'
import { connectionString, isSslEnabled } from '@/lib/externalSource'
import type { ExternalSource } from '@/types/externalSource'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 lg:px-4 lg:first:pl-0">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">{children}</div>
    </div>
  )
}

/**
 * Siêu dữ liệu của nguồn (thử kết nối nay nằm trong modal Sửa, cùng chỗ với thông tin nó kiểm tra): đọc mỗi lần vào, sửa vài lần trong đời. Vì vậy nằm thành một dải mảnh
 * chứ không phải card cao — chỗ trong màn hình đầu để dành cho bảng job, thứ người dùng vào để làm.
 * Không bọc Card: ở đây không có phân cấp nào để elevation nói lên (CONVENTIONS.md § styling).
 */
export function SourceMetaBar({
  source,
  nodeName,
  onEdit,
  onDelete,
}: {
  source: ExternalSource
  nodeName: string
  onEdit: () => void
  onDelete: () => void
}) {
  const connection = connectionString(source)

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap gap-x-0 gap-y-3 lg:divide-x lg:divide-border">
          <Field label="Kết nối">
            <span className="tabular truncate">{connection}</span>
            {isSslEnabled(source) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>SSL: {source.connectionConfig.sslMode}</TooltipContent>
              </Tooltip>
            )}
            <CopyButton value={connection} label={`Sao chép chuỗi kết nối của ${source.name}`} />
          </Field>

          <Field label="Đơn vị">
            <span className="truncate">{nodeName}</span>
          </Field>

          <Field label="Đồng bộ gần nhất">
            {source.lastSyncStatus ? (
              <StatusBadge status={source.lastSyncStatus} />
            ) : (
              <StatusBadge status="PENDING" label="Chưa đồng bộ" />
            )}
            {source.lastSyncAt && (
              <span className="tabular text-muted-foreground">{formatDateTime(source.lastSyncAt)}</span>
            )}
          </Field>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            Sửa nguồn
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 data-icon="inline-start" />
            Xóa nguồn
          </Button>
        </div>
      </div>

      {source.lastError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Lỗi đồng bộ gần nhất</AlertTitle>
          <AlertDescription className="font-mono text-xs break-words">{source.lastError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
