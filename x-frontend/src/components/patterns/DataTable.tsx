import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Có hàm này thì cột sort được. Trả null cho ô trống để luôn xếp cuối. */
  sortValue?: (row: T) => string | number | null | undefined
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[] | undefined
  getRowId: (row: T) => string | number
  isLoading?: boolean
  /** Hiện khi không có dữ liệu nào — truyền <EmptyState />. */
  empty?: React.ReactNode
  /** Bật ô tìm kiếm; hàm trả về chuỗi gộp các field cần khớp. */
  searchable?: { placeholder?: string; getText: (row: T) => string }
  /** Filter/action phụ nằm cạnh ô tìm kiếm. */
  toolbar?: React.ReactNode
  /** 0 = tắt phân trang. Mặc định 20. */
  pageSize?: number
  onRowClick?: (row: T) => void
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

// Backend chưa có endpoint phân trang nào (mọi list trả full), nên sort/search/paginate
// đều chạy client-side. Khi backend bổ sung Pageable thì đổi component này, không đổi page.
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  empty,
  searchable,
  toolbar,
  pageSize = 20,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!rows) return []
    if (!searchable || !query.trim()) return rows
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => searchable.getText(row).toLowerCase().includes(needle))
  }, [rows, searchable, query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return filtered
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
      return String(left).localeCompare(String(right), 'vi') * factor
    })
  }, [filtered, sort, columns])

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage = Math.min(page, pageCount - 1)
  const visible = pageSize > 0 ? sorted.slice(safePage * pageSize, (safePage + 1) * pageSize) : sorted

  function toggleSort(key: string) {
    setPage(0)
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const hasToolbar = Boolean(searchable || toolbar)
  const isEmpty = !isLoading && sorted.length === 0

  return (
    <div className="flex flex-col gap-4">
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <InputGroup className="w-full sm:max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                placeholder={searchable.placeholder ?? 'Tìm kiếm'}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
              />
            </InputGroup>
          )}
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.sortValue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2.5 h-7 font-medium text-muted-foreground"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}
                      {sort?.key !== column.key ? (
                        <ChevronsUpDown data-icon="inline-end" className="opacity-50" />
                      ) : sort.direction === 'asc' ? (
                        <ArrowUp data-icon="inline-end" />
                      ) : (
                        <ArrowDown data-icon="inline-end" />
                      )}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="h-11">
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isEmpty && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-10">
                  {empty}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              visible.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className={cn('h-11', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {pageSize > 0 && pageCount > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground tabular">
            {safePage * pageSize + 1}-{Math.min((safePage + 1) * pageSize, sorted.length)} trên{' '}
            {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground tabular">
              {safePage + 1}/{pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
