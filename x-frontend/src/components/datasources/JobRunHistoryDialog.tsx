import { History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime } from '@/lib/datetime'
import type { ExternalSourceJobRun } from '@/types/externalSource'

/**
 * Lịch sử chạy đầy đủ. Backend có lưu từng lượt vào `external_source_job_run`, nên phần này chỉ
 * là bày ra thứ đã có — bảng sức khỏe bên ngoài chỉ đưa con số tổng, còn thành công/thất bại
 * rơi vào lúc nào thì phải xem ở đây.
 */
export function JobRunHistoryDialog({
  runs,
  hours,
  open,
  onOpenChange,
}: {
  runs: ExternalSourceJobRun[]
  hours: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const columns: DataTableColumn<ExternalSourceJobRun>[] = [
    {
      key: 'startedAt',
      header: 'Bắt đầu',
      className: 'tabular whitespace-nowrap',
      cell: (run) => formatDateTime(run.startedAt),
    },
    {
      key: 'status',
      header: 'Kết quả',
      headerClassName: 'w-40',
      className: 'w-40',
      filter: {
        type: 'select',
        placeholder: 'Kết quả',
        getValue: (run) => run.status,
        options: [
          { value: 'SUCCESS', label: 'Thành công' },
          { value: 'FAILED', label: 'Thất bại' },
          { value: 'RUNNING', label: 'Đang chạy' },
        ],
      },
      cell: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: 'rowCount',
      header: 'Số dòng',
      headerClassName: 'w-32 text-right',
      className: 'tabular w-32 text-right whitespace-nowrap',
      cell: (run) => `${run.rowCount.toLocaleString('vi-VN')} dòng`,
    },
    {
      key: 'error',
      header: 'Lỗi',
      // Chốt bề ngang: nội dung lỗi Postgres dài hàng trăm ký tự, thả tự do thì nó kéo giãn
      // bảng và đẩy mọi cột khác ra ngoài màn hình.
      headerClassName: 'w-[420px]',
      className: 'w-[420px] max-w-[420px]',
      cell: (run) =>
        run.error ? (
          <span className="line-clamp-3 rounded-md bg-critical/10 px-2 py-1 text-[12px] leading-snug break-words whitespace-normal text-critical">
            {run.error}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Lịch sử chạy</DialogTitle>
          <DialogDescription>
            Từng lượt chạy trong {hours} giờ qua, mới nhất ở trên.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            rows={runs}
            getRowId={(run) => run.id}
            isLoading={false}
            showIndex={false}
            pageSize={0}
            empty={
              <EmptyState
                icon={History}
                title="Chưa có lượt chạy nào"
                description={`Truy vấn này chưa chạy lần nào trong ${hours} giờ qua.`}
              />
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
