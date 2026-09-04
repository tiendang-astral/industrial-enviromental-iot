import { AlertTriangle, Clock, Plus } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { renderPreviewCell } from '@/components/datasources/PreviewTable'
import type { Datastream } from '@/types/dashboard'
import type { PreviewColumn, PreviewResult } from '@/types/externalSource'

/** Một dòng kết quả, giữ kèm vị trí để làm khoá — dữ liệu ngoài không chắc có cột định danh. */
interface Row {
  index: number
  cells: (string | number | boolean | null)[]
}

/**
 * Ba trạng thái của một cột đều là chip cùng cỡ nằm dưới tên cột, nên nhìn ngang một lượt là thấy
 * cột nào chưa dùng: chip đặc = đã thành kênh, viền đứt = còn trống và bấm được.
 */
function ColumnHead({
  column,
  isTimestamp,
  datastream,
  onBind,
}: {
  column: PreviewColumn
  isTimestamp: boolean
  datastream: Datastream | undefined
  onBind: (column: PreviewColumn) => void
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 py-1">
      <span className="font-mono text-[12.5px] font-medium text-foreground">{column.name}</span>
      {isTimestamp ? (
        <Badge variant="outline" className="h-6 gap-1 font-normal">
          <Clock className="size-3" />
          mốc thời gian
        </Badge>
      ) : datastream ? (
        <Badge variant="secondary" className="h-6 max-w-44 font-normal">
          <span className="truncate">{datastream.name}</span>
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-6 border-dashed px-2 text-xs font-normal text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onBind(column)}
        >
          <Plus data-icon="inline-start" />
          Tạo kênh
        </Button>
      )}
    </div>
  )
}

export function JobDataTable({
  result,
  isLoading,
  error,
  timestampColumn,
  datastreams,
  onBind,
}: {
  result: PreviewResult | null
  isLoading: boolean
  error: string | null
  timestampColumn: string
  datastreams: Datastream[]
  onBind: (column: PreviewColumn) => void
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Không đọc được dữ liệu</AlertTitle>
        <AlertDescription className="font-mono text-xs whitespace-pre-wrap">{error}</AlertDescription>
      </Alert>
    )
  }

  const previewColumns = result?.columns ?? []
  const columns: DataTableColumn<Row>[] = previewColumns.map((column, columnIndex) => ({
    key: column.name,
    // Tên cột là định danh SQL nên giữ nguyên chữ thường; hàng tiêu đề mặc định viết hoa toàn bộ.
    headerClassName: 'h-auto py-2 align-bottom normal-case tracking-normal',
    className: 'tabular font-mono text-[12.5px] whitespace-nowrap',
    header: (
      <ColumnHead
        column={column}
        isTimestamp={column.name.toLowerCase() === timestampColumn.toLowerCase()}
        datastream={datastreams.find(
          (item) => item.sourceField?.toLowerCase() === column.name.toLowerCase()
        )}
        onBind={onBind}
      />
    ),
    cell: (row) => renderPreviewCell(row.cells[columnIndex]),
  }))

  const rows: Row[] = (result?.rows ?? []).map((cells, index) => ({ index, cells }))

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.index}
      isLoading={isLoading}
      showIndex={false}
      pageSize={20}
      pageSizeOptions={[20, 50, 100]}
      empty={
        <EmptyState
          icon={Clock}
          title="Bảng nguồn chưa có dòng nào"
          description="Câu truy vấn chạy được nhưng chưa trả về dữ liệu."
        />
      }
    />
  )
}
