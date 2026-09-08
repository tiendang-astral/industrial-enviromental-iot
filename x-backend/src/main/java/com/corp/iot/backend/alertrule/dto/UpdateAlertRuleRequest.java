package com.corp.iot.backend.alertrule.dto;

import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

/** Không cho đổi {@code tenantNodeId}/{@code metricId} — đổi thì là rule khác, tạo mới. */
public record UpdateAlertRuleRequest(
        @NotBlank String name,
        @NotNull AlertSeverity severity,
        @NotNull AlertConditionGroup conditions,
        @PositiveOrZero int durationSeconds,
        @NotEmpty @Valid List<AlertChannelRequest> channels
) {
}
