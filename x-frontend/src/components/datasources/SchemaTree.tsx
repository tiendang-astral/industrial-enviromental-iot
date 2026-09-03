import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Hash, Search, Table2, Type } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SchemaColumn, SchemaTable } from '@/types/externalSource'

function columnIcon(column: SchemaColumn) {
  if (column.timestamp) return Clock
  if (column.numeric) return Hash
  return Type
}

export function SchemaTree({
  tables,
  isLoading,
  activeTable,
  onSelectTable,
  onInsertColumn,
}: {
  tables: SchemaTable[]
  isLoading: boolean
  activeTable: string | null
  onSelectTable: (table: SchemaTable) => void
  onInsertColumn: (columnName: string) => void
}) {
  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<string | null>(activeTable)

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()
    if (!needle) return tables
    return tables.filter(
      (table) =>
        table.name.toLowerCase().includes(needle) ||
        table.columns.some((column) => column.name.toLowerCase().includes(needle))
    )
  }, [tables, term])

  const grouped = useMemo(() => {
    const map = new Map<string, SchemaTable[]>()
    filtered.forEach((table) => {
      const list = map.get(table.schema) ?? []
      list.push(table)
      map.set(table.schema, list)
    })
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Tìm bảng, cột…"
          className="pl-9"
          aria-label="Tìm bảng hoặc cột"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      )}

      {!isLoading && tables.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          Không đọc được bảng nào. Tài khoản kết nối có thể không có quyền xem cấu trúc database.
        </p>
      )}

      {!isLoading && tables.length > 0 && filtered.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">Không có bảng hay cột nào khớp “{term}”.</p>
      )}

      <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
        <div className="flex flex-col gap-3 pb-2">
          {grouped.map(([schema, schemaTables]) => (
            <div key={schema} className="flex flex-col gap-0.5">
              <p className="px-2 py-1 font-mono text-[11px] text-muted-foreground">{schema}</p>
              {schemaTables.map((table) => {
                const key = `${table.schema}.${table.name}`
                const isActive = activeTable === key
                const isOpen = expanded === key
                return (
                  <div key={key} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(isOpen ? null : key)
                        onSelectTable(table)
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-(--motion-fast)',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                      )}
                      <Table2 className="size-3.5 shrink-0 opacity-70" />
                      <span className="flex-1 truncate font-mono text-[12.5px]">{table.name}</span>
                      {table.estimatedRows !== null && (
                        <span className="tabular shrink-0 text-[11px] text-muted-foreground">
                          {table.estimatedRows.toLocaleString('vi-VN')}
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="flex flex-col border-l border-border pl-2 ml-4">
                        {table.columns.map((column) => {
                          const Icon = columnIcon(column)
                          return (
                            <button
                              key={column.name}
                              type="button"
                              onClick={() => onInsertColumn(column.name)}
                              title="Bấm để chèn vào câu truy vấn"
                              className={cn(
                                'flex items-center gap-2 rounded-md px-2 py-1 text-left font-mono text-[11.5px]',
                                'text-muted-foreground transition-colors duration-(--motion-fast)',
                                'hover:bg-accent hover:text-accent-foreground',
                                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                column.timestamp && 'text-primary'
                              )}
                            >
                              <Icon className="size-3 shrink-0 opacity-70" />
                              <span className="flex-1 truncate">{column.name}</span>
                              <span className="shrink-0 text-[10.5px] opacity-70">{column.dataType}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
