import { useQuery } from '@tanstack/react-query'
import { listAlertRuleGroups } from '@/services/alertService'

export function useAlertRuleGroupsQuery() {
  return useQuery({
    queryKey: ['alert-rule-groups'],
    queryFn: listAlertRuleGroups,
  })
}
