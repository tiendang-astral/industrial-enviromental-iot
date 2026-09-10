package com.corp.iot.backend.alertrulegroup.dto;

import com.corp.iot.backend.alertrule.dto.AlertChannelRequest;
import com.corp.iot.backend.alertrule.dto.AlertChannelResponse;
import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import com.corp.iot.backend.datastream.entity.SourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;
import java.util.List;

public final class AlertRuleGroupDtos {

    private AlertRuleGroupDtos() {
    }

    /** Ngưỡng + thời lượng của MỘT chỉ số — form có bao nhiêu tab thì gửi bấy nhiêu phần tử. */
    public record MetricRuleInput(
            @NotNull Long metricId,
            @NotNull AlertConditionGroup conditions,
            @PositiveOrZero int durationSeconds
    ) {
    }

    public record SaveAlertRuleGroupRequest(
            @NotBlank String name,
            @NotNull AlertSeverity severity,
            @NotNull SourceType sourceType,
            /** Phạm vi đích danh; chỉ nhận danh sách khớp `sourceType`, null = không giới hạn. */
            List<Long> gatewayIds,
            List<Long> externalSourceIds,
            @NotEmpty List<Long> tenantNodeIds,
            @NotEmpty @Valid List<MetricRuleInput> metrics,
            @NotEmpty @Valid List<AlertChannelRequest> channels
    ) {
    }

    /** Một rule con đã trải phẳng — bảng ở FE hiện nhóm, mở ra mới xem từng dòng. */
    public record GroupRuleResponse(
            Long id,
            Long tenantNodeId,
            Long metricId,
            String metricCode,
            String metricUnit,
            String sourceType,
            List<Long> gatewayIds,
            List<Long> externalSourceIds,
            AlertConditionGroup conditions,
            int durationSeconds,
            boolean enabled
    ) {
    }

    public record AlertRuleGroupResponse(
            Long id,
            String name,
            String severity,
            String sourceType,
            List<Long> gatewayIds,
            List<Long> externalSourceIds,
            List<Long> tenantNodeIds,
            List<Long> metricIds,
            /** Tất cả rule con đang bật; nhóm tắt khi mọi rule con đều tắt. */
            boolean enabled,
            int ruleCount,
            List<GroupRuleResponse> rules,
            List<AlertChannelResponse> channels,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
