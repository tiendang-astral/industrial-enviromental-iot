package com.corp.iot.backend.alert.dto;

import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;

import java.time.Instant;

public record AlertResponse(
        Long id,
        Long ruleId,
        String ruleName,
        Long tenantNodeId,
        Long datastreamId,
        String datastreamName,
        String metricCode,
        String metricUnit,
        String status,
        String severity,
        AlertConditionGroup thresholdSnapshot,
        Double lastObservedValue,
        Instant lastObservedAt,
        Instant startedAt,
        Instant triggeredAt,
        Instant recoveredAt
) {
}
