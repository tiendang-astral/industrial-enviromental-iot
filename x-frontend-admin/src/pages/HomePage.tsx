import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Database, Router, Users } from 'lucide-react'
import { TenantStatsTable } from '@/components/dashboard/TenantStatsTable'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PageHeader } from '@/components/patterns/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'
import { usePlatformDashboardSummaryQuery } from '@/queries/usePlatformDashboardSummaryQuery'
import { useTenantTrendQuery } from '@/queries/useTenantTrendQuery'
import { useUserTrendQuery } from '@/queries/useUserTrendQuery'
import type { TrendRange } from '@/types/platformDashboard'

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  to,
  isLoading,
}: {
  icon: typeof Building2
  label: string
  value: number
  unit: string
  to?: string
  isLoading: boolean
}) {
  const animatedValue = useCountUp(value)

  const card = (
    <Card
      className={cn(
        'shadow-sm',
        to && 'transition-colors duration-[var(--motion-fast)] hover:border-primary/40'
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="flex items-baseline gap-1.5 text-3xl tabular">
          {isLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <>
              {animatedValue.toLocaleString('vi-VN')}
              <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  )

  if (!to) return card

  return (
    <Link
      to={to}
      className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {card}
    </Link>
  )
}

export default function HomePage() {
  const { data: summary, isLoading: summaryLoading } = usePlatformDashboardSummaryQuery()

  const [userRange, setUserRange] = useState<TrendRange>('7d')
  const [tenantRange, setTenantRange] = useState<TrendRange>('7d')
  const { data: userTrend, isLoading: userTrendLoading } = useUserTrendQuery(userRange)
  const { data: tenantTrend, isLoading: tenantTrendLoading } = useTenantTrendQuery(tenantRange)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Tổng người dùng"
          value={summary?.totalTenantUsers ?? 0}
          unit="người dùng"
          isLoading={summaryLoading}
        />
        <StatCard
          icon={Building2}
          label="Tổng tổ chức"
          value={summary?.totalTenants ?? 0}
          unit="tổ chức"
          to="/tenants"
          isLoading={summaryLoading}
        />
        <StatCard
          icon={Router}
          label="Tổng thiết bị"
          value={summary?.totalDevices ?? 0}
          unit="thiết bị"
          isLoading={summaryLoading}
        />
        <StatCard
          icon={Database}
          label="Tổng nguồn dữ liệu"
          value={summary?.totalDataSources ?? 0}
          unit="nguồn"
          isLoading={summaryLoading}
        />
      </div>

      <TenantStatsTable data={summary?.tenants ?? []} isLoading={summaryLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Biến động người dùng"
          data={userTrend}
          isLoading={userTrendLoading}
          range={userRange}
          onRangeChange={setUserRange}
          label="Người dùng"
          color="var(--chart-1)"
          gradientId="fill-user-trend"
        />
        <TrendChart
          title="Biến động tổ chức"
          data={tenantTrend}
          isLoading={tenantTrendLoading}
          range={tenantRange}
          onRangeChange={setTenantRange}
          label="Tổ chức"
          color="var(--chart-2)"
          gradientId="fill-tenant-trend"
        />
      </div>
    </div>
  )
}
