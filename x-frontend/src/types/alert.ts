export type ConditionOperator = '>' | '>=' | '<' | '<='

export type AlertSeverity = 'WARNING' | 'CRITICAL'

export type AlertStatus = 'PENDING' | 'ACTIVE' | 'RECOVERED' | 'STALE'

export type ChannelType = 'EMAIL' | 'TELEGRAM'

/**
 * Loại nguồn quy tắc áp vào. `null` chỉ còn ở quy tắc tạo TRƯỚC `V24` ("mọi loại nguồn") — form
 * nay bắt buộc chọn một loại, backend nhận `@NotNull`.
 */
export type AlertSourceType = 'GATEWAY_PIN' | 'EXTERNAL_SOURCE_JOB' | null

export interface AlertCondition {
  operator: ConditionOperator
  threshold: number
}

/** Nội dung `alert_rule.conditions_json` — một tầng, một phép nối (xem DATABASE.md § alert_rule). */
export interface AlertConditionGroup {
  logic: 'AND' | 'OR'
  conditions: AlertCondition[]
}

export interface AlertChannel {
  id: number
  channelType: ChannelType
  name: string | null
  address: string
  /** Backend không bao giờ trả token — cờ này chỉ cho biết token đã có. */
  hasBotToken: boolean
}

export interface AlertChannelInput {
  channelType: ChannelType
  name?: string | null
  address: string
  telegramBotToken?: string | null
}

export interface AlertRule {
  id: number
  tenantNodeId: number
  name: string
  metricId: number
  metricCode: string | null
  metricUnit: string | null
  severity: AlertSeverity
  conditions: AlertConditionGroup
  durationSeconds: number
  enabled: boolean
  channels: AlertChannel[]
  createdAt: string
  updatedAt: string
}

export interface CreateAlertRuleRequest {
  tenantNodeId: number
  name: string
  metricId: number
  severity: AlertSeverity
  conditions: AlertConditionGroup
  durationSeconds: number
  channels: AlertChannelInput[]
}

export type UpdateAlertRuleRequest = Omit<CreateAlertRuleRequest, 'tenantNodeId' | 'metricId'>

export interface Alert {
  id: number
  ruleId: number
  ruleName: string | null
  tenantNodeId: number
  datastreamId: number | null
  datastreamName: string | null
  metricCode: string | null
  metricUnit: string | null
  status: AlertStatus
  severity: AlertSeverity
  thresholdSnapshot: AlertConditionGroup | null
  lastObservedValue: number | null
  lastObservedAt: string | null
  startedAt: string
  triggeredAt: string | null
  recoveredAt: string | null
}

/** Một chỉ số trong nhóm — form có bao nhiêu tab thì gửi bấy nhiêu phần tử. */
export interface MetricRuleInput {
  metricId: number
  conditions: AlertConditionGroup
  durationSeconds: number
}

export interface SaveAlertRuleGroupRequest {
  name: string
  severity: AlertSeverity
  sourceType: Exclude<AlertSourceType, null>
  /** Phạm vi đích danh — gửi đúng danh sách khớp `sourceType`, danh sách kia bỏ trống. */
  gatewayIds?: number[]
  externalSourceIds?: number[]
  tenantNodeIds: number[]
  metrics: MetricRuleInput[]
  channels: AlertChannelInput[]
}

export interface GroupRule {
  id: number
  tenantNodeId: number
  metricId: number
  metricCode: string | null
  metricUnit: string | null
  sourceType: AlertSourceType
  gatewayIds: number[] | null
  externalSourceIds: number[] | null
  conditions: AlertConditionGroup
  durationSeconds: number
  enabled: boolean
}

export interface AlertRuleGroup {
  id: number
  name: string
  severity: AlertSeverity
  sourceType: AlertSourceType
  /** null = quy tắc cũ, không giới hạn thiết bị/nguồn nào. */
  gatewayIds: number[] | null
  externalSourceIds: number[] | null
  tenantNodeIds: number[]
  metricIds: number[]
  enabled: boolean
  ruleCount: number
  rules: GroupRule[]
  channels: AlertChannel[]
  createdAt: string
  updatedAt: string
}
