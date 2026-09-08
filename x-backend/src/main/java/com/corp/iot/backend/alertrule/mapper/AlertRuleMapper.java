package com.corp.iot.backend.alertrule.mapper;

import com.corp.iot.backend.alertrule.dto.AlertChannelResponse;
import com.corp.iot.backend.alertrule.dto.AlertRuleResponse;
import com.corp.iot.backend.alertrule.entity.AlertChannel;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AlertRuleMapper {

    public AlertRuleResponse toResponse(AlertRule rule, Metric metric, List<AlertChannel> channels) {
        return new AlertRuleResponse(
                rule.getId(),
                rule.getTenantNodeId(),
                rule.getName(),
                rule.getMetricId(),
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                rule.getSeverity().name(),
                rule.getSourceType() != null ? rule.getSourceType().name() : null,
                rule.getConditions(),
                rule.getDurationSeconds(),
                rule.isEnabled(),
                channels.stream().map(this::toChannelResponse).toList(),
                rule.getCreatedAt(),
                rule.getUpdatedAt()
        );
    }

    public AlertChannelResponse toChannelResponse(AlertChannel channel) {
        return new AlertChannelResponse(
                channel.getId(),
                channel.getChannelType().name(),
                channel.getName(),
                channel.getAddress(),
                channel.getTelegramBotToken() != null
        );
    }
}
