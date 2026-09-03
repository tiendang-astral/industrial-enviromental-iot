import { format, parseISO } from 'date-fns'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TrendPoint, TrendRange } from '@/types/platformDashboard'

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
]

interface TrendChartProps {
  title: string
  data: TrendPoint[] | undefined
  isLoading: boolean
  range: TrendRange
  onRangeChange: (range: TrendRange) => void
  label: string
  color: string
  gradientId: string
}

export function TrendChart({
  title,
  data,
  isLoading,
  range,
  onRangeChange,
  label,
  color,
  gradientId,
}: TrendChartProps) {
  const chartConfig = {
    value: { label, color },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        <Tabs value={range} onValueChange={(value) => onRangeChange(value as TrendRange)}>
          <TabsList>
            {RANGE_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value: string) => format(parseISO(value), 'dd/MM')}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => format(parseISO(value as string), 'dd/MM/yyyy')}
                    indicator="dot"
                  />
                }
              />
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                fill={`url(#${gradientId})`}
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
