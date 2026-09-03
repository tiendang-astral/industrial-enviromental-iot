import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Giá trị sentinel cho mục "tất cả" — Radix Select cấm SelectItem có value rỗng. */
const ALL = '__all__'

export type DataTableFilter<T> =
  | { type: 'text'; placeholder?: string; getValue: (row: T) => string }
  | {
      type: 'select'
      placeholder?: string
      getValue: (row: T) => string
      options: { value: string; label: string }[]
    }

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Có hàm này thì cột sort được (bấm header). */
  sortValue?: (row: T) => string | number | null | undefined
  /** Bật ô lọc của riêng cột này ở hàng lọc ngay dưới hàng tiêu đề. */
  filter?: DataTableFilter<T>
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
  /** Bật ô tìm kiếm chung; hàm trả về chuỗi gộp các field cần khớp. */
  searchable?: { placeholder?: string; getText: (row: T) => string }
  /** Filter/action phụ nằm cạnh ô tìm kiếm. */
  toolbar?: React.ReactNode
  /** Cột số thứ tự, đánh liên tục qua các trang. Mặc định tắt — chỉ bật ở bảng cần. */
  showIndex?: boolean
  /** 0 = tắt phân trang. Đây là cỡ trang KHỞI TẠO, người dùng đổi được ở chân bảng. */
  pageSize?: number
  pageSizeOptions?: number[]
  onRowClick?: (row: T) => void
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/**
 * Dãy số trang có dấu ba chấm: luôn giữ trang đầu, trang cuối và cửa sổ quanh trang hiện tại.
 * `null` = vị trí ba chấm. Tối đa 7 ô nên thanh phân trang không bao giờ đẩy vỡ layout.
 */
function buildPageList(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages: (number | null)[] = [1]
  const start = Math.max(2, current)
  const end = Math.min(total - 1, current + 2)

  if (start > 2) pages.push(null)
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push(null)
  pages.push(total)

  return pages
}

/**
 * Click vào hàng mở trang chi tiết, NHƯNG không được nuốt click của nút/link nằm trong hàng
 * (cột Hành động, link tên...). Bắt theo phần tử tương tác gần nhất thay vì đánh dấu từng cột —
 * cột nào thêm nút về sau cũng tự đúng, không phải nhớ khai báo thêm.
 */
function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest('a, button, input, select, textarea, [role="checkbox"], [role="switch"]')
  )
}

// Backend chưa có endpoint phân trang nào (mọi list trả full), nên search/lọc/sort/phân trang
// đều chạy client-side. Khi backend bổ sung Pageable thì đổi component này, không đổi page.
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  empty,
  searchable,
  toolbar,
  showIndex = false,
  pageSize: initialPageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const isPaginated = pageSize > 0
  const filterColumns = columns.filter((column) => column.filter)
  const hasFilterRow = filterColumns.length > 0

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = query.trim().toLowerCase()
    const activeFilters = filterColumns
      .map((column) => ({ column, value: columnFilters[column.key] }))
      .filter((entry) => entry.value)

    return rows.filter((row) => {
      if (searchable && needle && !searchable.getText(row).toLowerCase().includes(needle)) {
        return false
      }
      return activeFilters.every(({ column, value }) => {
        const cellValue = column.filter!.getValue(row)
        return column.filter!.type === 'select'
          ? cellValue === value
          : cellValue.toLowerCase().includes(value.toLowerCase())
      })
    })
  }, [rows, searchable, query, filterColumns, columnFilters])

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

  const pageCount = isPaginated ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage = Math.min(page, pageCount - 1)
  const visible = isPaginated ? sorted.slice(safePage * pageSize, (safePage + 1) * pageSize) : sorted

  function toggleSort(key: string) {
    setPage(0)
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function setFilter(key: string, value: string) {
    setPage(0)
    setColumnFilters((current) => ({ ...current, [key]: value }))
  }

  const hasToolbar = Boolean(searchable || toolbar)
  const isEmpty = !isLoading && sorted.length === 0
  const columnCount = columns.length + (showIndex ? 1 : 0)

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

      <div className="overflow-x-auto rounded-lg border bg-muted/20 [&_[data-slot=table-container]]:overflow-x-visible">
        <Table>
          {/* Hàng TIÊU ĐỀ tách biệt màu với hàng dữ liệu (bg-muted đặc, giống bảng Dashboard) —
              hàng LỌC bên dưới thì dùng chung nền với hàng dữ liệu vì đó là chỗ gõ/chọn vào,
              không phải khung bảng. */}
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {showIndex && (
                <TableHead className="w-12 px-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  STT
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                    column.headerClassName
                  )}
                >
                  {column.sortValue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2.5 h-7 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
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

            {hasFilterRow && (
              // Ô lọc cao 7 (28px) trong hàng cao 10 (40px): thấp hơn hẳn hàng tiêu đề và hàng dữ
              // liệu để không kéo đầu bảng phình ra thành hai tầng nặng ngang nhau.
              <TableRow className="h-10 bg-card hover:bg-card">
                {showIndex && <TableHead className="py-2 pr-2 pl-1" />}
                {columns.map((column) => (
                  <TableHead key={column.key} className="py-2 pr-2 pl-1 align-middle">
                    {column.filter?.type === 'text' && (
                      <InputGroup className="h-7 w-full rounded-md">
                        <InputGroupAddon>
                          <Search className="size-3.5" />
                        </InputGroupAddon>
                        <InputGroupInput
                          className="h-7 text-xs"
                          value={columnFilters[column.key] ?? ''}
                          placeholder={column.filter.placeholder ?? 'Lọc'}
                          onChange={(event) => setFilter(column.key, event.target.value)}
                        />
                      </InputGroup>
                    )}
                    {column.filter?.type === 'select' && (
                      <Select
                        value={columnFilters[column.key] || ALL}
                        onValueChange={(value) => setFilter(column.key, value === ALL ? '' : value)}
                      >
                        <SelectTrigger size="sm" className="w-full rounded-md text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>
                            {column.filter.placeholder
                              ? `Tất cả ${column.filter.placeholder.toLowerCase()}`
                              : 'Tất cả'}
                          </SelectItem>
                          {column.filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            )}
          </TableHeader>

          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="h-12 bg-card">
                  {showIndex && (
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-6" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isEmpty && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="py-10">
                  {empty}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              visible.map((row, rowIndex) => (
                <TableRow
                  key={getRowId(row)}
                  className={cn('h-12 bg-card', onRowClick && 'cursor-pointer')}
                  onClick={
                    onRowClick
                      ? (event) => {
                          if (isInteractiveTarget(event.target)) return
                          onRowClick(row)
                        }
                      : undefined
                  }
                >
                  {showIndex && (
                    <TableCell className="text-center tabular text-muted-foreground">
                      {safePage * (isPaginated ? pageSize : 0) + rowIndex + 1}
                    </TableCell>
                  )}
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

      {isPaginated && !isLoading && sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hiển thị</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[4.5rem] text-sm tabular" aria-label="Số dòng mỗi trang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)} className="tabular">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground tabular">
              trên tổng {sorted.length} dòng
            </span>
          </div>

          {/* Hiện cả khi chỉ có 1 trang: thanh điều hướng biến mất/hiện lại theo số dòng khiến chân
              bảng nhảy chỗ, và người dùng không biết bảng này có phân trang hay không. */}
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft />
                  <span className="sr-only">Trang trước</span>
                </Button>
              </PaginationItem>

              {buildPageList(safePage + 1, pageCount).map((pageNumber, index) =>
                pageNumber === null ? (
                  <PaginationItem key={`gap-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNumber}>
                    <Button
                      variant={pageNumber === safePage + 1 ? 'outline' : 'ghost'}
                      size="icon"
                      className="size-8 text-sm tabular"
                      aria-current={pageNumber === safePage + 1 ? 'page' : undefined}
                      onClick={() => setPage(pageNumber - 1)}
                    >
                      {pageNumber}
                    </Button>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight />
                  <span className="sr-only">Trang sau</span>
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
