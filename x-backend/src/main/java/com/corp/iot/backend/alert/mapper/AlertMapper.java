package com.corp.iot.backend.alert.mapper;

import com.corp.iot.backend.alert.dto.AlertResponse;
import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.stereotype.Component;

@Component
public class AlertMapper {

    public AlertResponse toResponse(Alert alert, AlertRule rule, Datastream datastream, Metric metric) {
        return new AlertResponse(
                alert.getId(),
                alert.getRuleId(),
                rule != null ? rule.getName() : null,
                alert.getTenantNodeId(),
                alert.getDatastreamId(),
                datastream != null ? datastream.getName() : null,
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                alert.getStatus().name(),
                alert.getSeverity().name(),
                alert.getThresholdSnapshot(),
                alert.getLastObservedValue(),
                alert.getLastObservedAt(),
                alert.getStartedAt(),
                alert.getTriggeredAt(),
                alert.getRecoveredAt()
        );
    }
}
