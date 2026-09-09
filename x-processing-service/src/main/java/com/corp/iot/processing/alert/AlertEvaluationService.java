package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.alert.notify.AlertNotification;
import com.corp.iot.processing.alert.notify.NotificationDispatcher;
import com.corp.iot.processing.entity.Alert;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

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

    /**
     * Tra sẵn rule cho cả lô bằng một lệnh MGET, để {@link #evaluateWith} không phải đi Redis nữa.
     * Processor gọi qua đây thay vì gọi thẳng resolver — nó không cần biết rule được cache thế nào.
     */
    public Map<AlertRuleResolver.RuleKey, List<ResolvedRule>> prefetchRules(List<AlertRuleResolver.RuleKey> keys) {
        return alertRuleResolver.resolveAll(keys);
    }

    /** Dùng cho luồng lẻ (external, theo cron) — tự tra rule rồi uỷ quyền. */
    public void evaluate(
            Long tenantId, Long tenantNodeId, ChannelRef channel, String metricCode,
            Double value, Instant measuredAt) {
        List<ResolvedRule> rules;
        try {
            rules = alertRuleResolver.resolve(tenantId, tenantNodeId, channel.metricId(), metricCode);
        } catch (Exception e) {
            // Bước tra rule cũng phải nằm trong lưới: nó chạy SAU khi số đo đã ghi InfluxDB.
            log.error("Không tra được rule cho datastreamId={}, bỏ qua đánh giá", channel.id(), e);
            return;
        }
        evaluateWith(tenantId, tenantNodeId, channel, metricCode, value, measuredAt, rules);
    }

    /**
     * Dùng cho luồng theo lô — rule đã được {@link AlertRuleResolver#resolveAll} tra sẵn cho cả lô
     * bằng một lệnh MGET, thay vì mỗi số đo một round-trip Redis.
     *
     * Chỉ bước TRA rule được gộp. Lọc source_type, so ngưỡng và state machine vẫn chạy riêng cho
     * từng số đo, theo đúng thứ tự trong lô.
     */
    public void evaluateWith(
            Long tenantId, Long tenantNodeId, ChannelRef channel, String metricCode,
            Double value, Instant measuredAt, List<ResolvedRule> rules) {
        try {
            for (ResolvedRule rule : rules) {
                // Cùng metric ở cùng node nhưng khác nguồn là hai thứ khác nhau: nhiệt độ trong
                // chuồng (gateway) và nhiệt độ thời tiết (database ngoài). Lọc ở đây chứ không
                // trong SQL để khỏi phải nhét source_type vào key cache.
                if (!rule.appliesTo(channel.sourceType())) {
                    continue;
                }
                boolean violated = alertConditionEvaluator.isViolated(rule.conditions(), value);
                AlertStateMachineService.Result result = alertStateMachineService.apply(
                        tenantId, tenantNodeId, channel.id(), rule, violated, value, measuredAt);
                if (result.transition() != AlertTransition.NONE) {
                    announce(tenantId, tenantNodeId, channel, rule, result, value, measuredAt);
                }
            }
        } catch (Exception e) {
            log.error("Đánh giá cảnh báo thất bại cho datastreamId={}, bỏ qua", channel.id(), e);
        }
    }

    private void announce(
            Long tenantId, Long tenantNodeId, ChannelRef channel, ResolvedRule rule,
            AlertStateMachineService.Result result, Double value, Instant measuredAt) {

        Alert alert = result.alert();
        boolean recovered = result.transition() == AlertTransition.RECOVERED;
        Metric metric = metricRepository.findById(channel.metricId()).orElse(null);

        notificationDispatcher.dispatch(new AlertNotification(
                rule.id(),
                rule.name(),
                rule.severity(),
                recovered,
                channel.name(),
                metric != null ? metric.getName() : null,
                metric != null ? metric.getUnit() : null,
                value,
                measuredAt));

        realtimePublisher.publishAlertStatus(
                tenantId, tenantNodeId, alert.getId(), rule.id(), rule.name(), channel.id(),
                alert.getStatus(), rule.severity(), value, measuredAt);
    }
}
