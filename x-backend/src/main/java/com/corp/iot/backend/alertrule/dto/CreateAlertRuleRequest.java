package com.corp.iot.backend.alertrule.dto;

import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record CreateAlertRuleRequest(
        @NotNull Long tenantNodeId,
        @NotBlank String name,
        @NotNull Long metricId,
        @NotNull AlertSeverity severity,
        @NotNull AlertConditionGroup conditions,
        @PositiveOrZero int durationSeconds,
        // Rule không có kênh nào thì bắn xong chẳng ai biết — đúng loại "cấu hình chết" mà
        // scopes[] của tenant-user cũng chặn.
        @NotEmpty @Valid List<AlertChannelRequest> channels
) {
}
