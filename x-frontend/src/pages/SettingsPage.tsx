import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/patterns/PageHeader'
import { MetricsTab } from '@/components/settings/MetricsTab'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SettingsPage() {
  const authorities = useAuthStore((state) => state.user?.authorities)
  const [tab, setTab] = useState('metrics')
  const [isCreateMetricOpen, setIsCreateMetricOpen] = useState(false)

  // Backend đã chặn bằng @PreAuthorize; chặn ở đây để người gõ thẳng URL không rơi vào một trang
  // chỉ toàn lỗi 403.
  if (!authorities?.includes('TENANT_ADMIN')) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Cài đặt" />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
        {/* Tab và nút hành động chung một hàng: tách hai hàng thì phần đầu trang ăn mất chỗ của
            bảng mà không nói thêm được gì. Nút nằm cạnh tab chứ không ở PageHeader vì nó thuộc về
            tab đang mở, không phải cả trang — nên nó bám theo `tab` thay vì bọc trong TabsContent
            (bọc sẽ thành hai tabpanel cho cùng một tab). */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="metrics">Chỉ số</TabsTrigger>
          </TabsList>

          {tab === 'metrics' && (
            <Button size="sm" onClick={() => setIsCreateMetricOpen(true)}>
              <Plus data-icon="inline-start" />
              Thêm chỉ số
            </Button>
          )}
        </div>

        <TabsContent value="metrics">
          <MetricsTab createOpen={isCreateMetricOpen} onCreateOpenChange={setIsCreateMetricOpen} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
