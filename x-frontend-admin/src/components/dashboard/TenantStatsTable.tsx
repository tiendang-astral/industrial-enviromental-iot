import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TenantStats } from '@/types/platformDashboard'

interface TenantStatsTableProps {
  data: TenantStats[]
  isLoading: boolean
}

export function TenantStatsTable({ data, isLoading }: TenantStatsTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-base leading-snug font-medium">Danh sách tổ chức</h2>
      <div>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Chưa có tổ chức nào"
            description="Tạo tổ chức đầu tiên ở trang Tổ chức."
          />
        ) : (
          <div className="max-h-[328px] overflow-y-auto rounded-lg border bg-muted/20 [&_[data-slot=table-container]]:overflow-x-visible">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 px-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    STT
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Tổ chức
                  </TableHead>
                  <TableHead className="px-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Người dùng
                  </TableHead>
                  <TableHead className="px-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Thiết bị
                  </TableHead>
                  <TableHead className="px-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Nguồn dữ liệu
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((tenant, index) => (
                  <TableRow key={tenant.tenantId} className="h-12 bg-card">
                    <TableCell className="px-4 text-center text-muted-foreground tabular">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4">
                      <Link to={`/tenants/${tenant.tenantId}`} className="font-medium hover:underline">
                        {tenant.tenantName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-center font-medium tabular">
                      {tenant.userCount}
                    </TableCell>
                    <TableCell className="px-4 text-center font-medium tabular">
                      {tenant.deviceCount}
                    </TableCell>
                    <TableCell className="px-4 text-center font-medium tabular">
                      {tenant.dataSourceCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
