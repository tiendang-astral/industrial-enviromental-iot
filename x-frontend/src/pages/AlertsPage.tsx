import { useState } from 'react'
import { toast } from 'sonner'
import { BellPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { PageHeader } from '@/components/patterns/PageHeader'
import { AlertRuleGroupsTable } from '@/components/alerts/AlertRuleGroupsTable'
import { AlertRuleWizardDialog } from '@/components/alerts/AlertRuleWizardDialog'
import { AlertsTable } from '@/components/alerts/AlertsTable'
import { useAlertRealtime } from '@/hooks/useAlertRealtime'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useDeleteAlertRuleGroupMutation,
  useUpdateAlertRuleGroupStatusMutation,
} from '@/queries/useAlertRuleGroupMutations'
import { useAlertRuleGroupsQuery } from '@/queries/useAlertRuleGroupsQuery'
import { useAlertsQuery } from '@/queries/useAlertsQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { AlertRuleGroup } from '@/types/alert'

export default function AlertsPage() {
  const [editingGroup, setEditingGroup] = useState<AlertRuleGroup | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<AlertRuleGroup | null>(null)

  const { data: nodes } = useTenantNodesQuery()
  const { data: metrics } = useMetricsQuery()
  const { data: alerts, isLoading: alertsLoading } = useAlertsQuery()
  const { data: groups, isLoading: groupsLoading } = useAlertRuleGroupsQuery()

  // Alert mới bắn thì bảng tự cập nhật, khỏi F5 — người trực ca không ngồi bấm tải lại.
  useAlertRealtime(nodes ?? [])

  const toggleMutation = useUpdateAlertRuleGroupStatusMutation()
  const deleteMutation = useDeleteAlertRuleGroupMutation()

  function openCreate() {
    setEditingGroup(null)
    setIsFormOpen(true)
  }

  function openEdit(group: AlertRuleGroup) {
    setEditingGroup(group)
    setIsFormOpen(true)
  }

  function toggleGroup(group: AlertRuleGroup) {
    toggleMutation.mutate(
      { id: group.id, enabled: !group.enabled },
      {
        onSuccess: () => toast.success(group.enabled ? 'Đã tắt quy tắc' : 'Đã bật quy tắc'),
        onError: (error) => toast.error(getApiErrorMessage(error, 'Đổi trạng thái thất bại')),
      }
    )
  }

  function confirmDelete() {
    if (!deletingGroup) return
    deleteMutation.mutate(deletingGroup.id, {
      onSuccess: () => {
        setDeletingGroup(null)
        toast.success('Đã xóa quy tắc')
      },
      onError: (error) => {
        setDeletingGroup(null)
        toast.error(getApiErrorMessage(error, 'Xóa quy tắc thất bại'))
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cảnh báo"
        description="Theo dõi sự cố đang diễn ra và cấu hình quy tắc ngưỡng cho từng đơn vị."
        actions={
          <Button onClick={openCreate}>
            <BellPlus data-icon="inline-start" />
            Thêm quy tắc
          </Button>
        }
      />

      <Tabs defaultValue="alerts" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
          <TabsTrigger value="rules">Quy tắc</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <AlertsTable alerts={alerts} nodes={nodes ?? []} isLoading={alertsLoading} />
        </TabsContent>

        <TabsContent value="rules">
          <AlertRuleGroupsTable
            groups={groups}
            nodes={nodes ?? []}
            metrics={metrics ?? []}
            isLoading={groupsLoading}
            onEdit={openEdit}
            onToggle={toggleGroup}
            onDelete={setDeletingGroup}
          />
        </TabsContent>
      </Tabs>

      <AlertRuleWizardDialog
        group={editingGroup}
        nodes={nodes ?? []}
        metrics={metrics ?? []}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <ConfirmDialog
        open={!!deletingGroup}
        onOpenChange={(next) => !next && setDeletingGroup(null)}
        title="Xóa quy tắc cảnh báo này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa quy tắc{' '}
            <span className="font-semibold">&ldquo;{deletingGroup?.name}&rdquo;</span>?
          </>
        }
        description={`Hệ thống sẽ ngừng ${deletingGroup?.ruleCount ?? 0} theo dõi thuộc quy tắc này. Lịch sử cảnh báo đã bắn vẫn được giữ lại.`}
        confirmLabel="Xóa quy tắc"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
