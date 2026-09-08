package com.corp.iot.backend.alertrule.dto;

import java.time.Instant;
import java.util.List;

public record AlertRuleResponse(
        Long id,
        Long tenantNodeId,
        String name,
        Long metricId,
        String metricCode,
        String metricUnit,
        String severity,
        String sourceType,
        AlertConditionGroup conditions,
        int durationSeconds,
        boolean enabled,
        List<AlertChannelResponse> channels,
        Instant createdAt,
        Instant updatedAt
) {
}
