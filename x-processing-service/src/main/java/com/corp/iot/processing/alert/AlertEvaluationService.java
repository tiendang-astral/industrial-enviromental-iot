package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.alert.notify.AlertNotification;
import com.corp.iot.processing.alert.notify.NotificationDispatcher;
import com.corp.iot.processing.entity.Alert;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Điểm vào chung của luồng cảnh báo, gọi ngay sau khi ghi reading (cả gateway lẫn external) —
 * xem ARCHITECTURE.md § Flow: Alert.
 *
 * Toàn bộ thân hàm bọc try/catch: cảnh báo hỏng không được phép làm hỏng việc ghi telemetry,
 * cùng nguyên tắc "log + skip, không throw" của các bước resolve khác trong service này.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertEvaluationService {

    private final AlertRuleResolver alertRuleResolver;
    private final AlertConditionEvaluator alertConditionEvaluator;
    private final AlertStateMachineService alertStateMachineService;
    private final NotificationDispatcher notificationDispatcher;
    private final RealtimePublisher realtimePublisher;
    private final MetricRepository metricRepository;

    public void evaluate(
            Long tenantId, Long tenantNodeId, Datastream datastream, String metricCode,
            Double value, Instant measuredAt) {
        try {
            List<ResolvedRule> rules = alertRuleResolver.resolve(
                    tenantId, tenantNodeId, datastream.getMetricId(), metricCode);
            for (ResolvedRule rule : rules) {
                // Cùng metric ở cùng node nhưng khác nguồn là hai thứ khác nhau: nhiệt độ trong
                // chuồng (gateway) và nhiệt độ thời tiết (database ngoài). Lọc ở đây chứ không
                // trong SQL để khỏi phải nhét source_type vào key cache.
                if (!rule.appliesTo(datastream.getSourceType())) {
                    continue;
                }
                boolean violated = alertConditionEvaluator.isViolated(rule.conditions(), value);
                AlertStateMachineService.Result result = alertStateMachineService.apply(
                        tenantId, tenantNodeId, datastream.getId(), rule, violated, value, measuredAt);
                if (result.transition() != AlertTransition.NONE) {
                    announce(tenantId, tenantNodeId, datastream, rule, result, value, measuredAt);
                }
            }
        } catch (Exception e) {
            log.error("Đánh giá cảnh báo thất bại cho datastreamId={}, bỏ qua", datastream.getId(), e);
        }
    }

    private void announce(
            Long tenantId, Long tenantNodeId, Datastream datastream, ResolvedRule rule,
            AlertStateMachineService.Result result, Double value, Instant measuredAt) {

        Alert alert = result.alert();
        boolean recovered = result.transition() == AlertTransition.RECOVERED;
        Metric metric = metricRepository.findById(datastream.getMetricId()).orElse(null);

        notificationDispatcher.dispatch(new AlertNotification(
                rule.id(),
                rule.name(),
                rule.severity(),
                recovered,
                datastream.getName(),
                metric != null ? metric.getName() : null,
                metric != null ? metric.getUnit() : null,
                value,
                measuredAt));

        realtimePublisher.publishAlertStatus(
                tenantId, tenantNodeId, alert.getId(), rule.id(), rule.name(), datastream.getId(),
                alert.getStatus(), rule.severity(), value, measuredAt);
    }
}
