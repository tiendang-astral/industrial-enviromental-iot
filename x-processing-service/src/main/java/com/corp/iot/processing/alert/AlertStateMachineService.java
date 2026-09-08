package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.entity.Alert;
import com.corp.iot.processing.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

/**
 * State machine {@code PENDING → ACTIVE → RECOVERED} của một cặp (rule, kênh dữ liệu).
 *
 * Mốc thời gian trạng thái dùng giờ hệ thống chứ không dùng {@code measuredAt}: {@code duration_seconds}
 * là "vi phạm liên tục bao lâu" theo thời gian thực, còn {@code measuredAt} có thể là mốc cũ.
 * {@code measuredAt} chỉ đi vào {@code last_observed_at}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertStateMachineService {

    private static final Set<String> OPEN_STATUSES = Set.of("PENDING", "ACTIVE");
    private static final String PENDING = "PENDING";
    private static final String ACTIVE = "ACTIVE";
    private static final String RECOVERED = "RECOVERED";

    private final AlertRepository alertRepository;

    @Transactional
    public Result apply(
            Long tenantId, Long tenantNodeId, Long datastreamId, ResolvedRule rule, boolean violated,
            Double value, Instant measuredAt) {

        String fingerprint = rule.id() + ":" + datastreamId;
        Optional<Alert> open = alertRepository.findByTenantIdAndFingerprintAndStatusIn(
                tenantId, fingerprint, OPEN_STATUSES);
        Instant now = Instant.now();

        if (!violated) {
            if (open.isEmpty()) {
                return new Result(AlertTransition.NONE, null);
            }
            Alert alert = open.get();
            // Alert còn PENDING thì chưa từng báo cho ai — không cần báo "đã hết".
            boolean wasActive = ACTIVE.equals(alert.getStatus());
            alert.setStatus(RECOVERED);
            alert.setRecoveredAt(now);
            observe(alert, value, measuredAt);
            alertRepository.save(alert);
            return new Result(wasActive ? AlertTransition.RECOVERED : AlertTransition.NONE, alert);
        }

        if (open.isEmpty()) {
            return openNew(tenantId, tenantNodeId, datastreamId, rule, fingerprint, value, measuredAt, now);
        }

        Alert alert = open.get();
        observe(alert, value, measuredAt);
        if (PENDING.equals(alert.getStatus())
                && !now.isBefore(alert.getStartedAt().plusSeconds(rule.durationSeconds()))) {
            alert.setStatus(ACTIVE);
            alert.setTriggeredAt(now);
            alertRepository.save(alert);
            return new Result(AlertTransition.ACTIVATED, alert);
        }
        alertRepository.save(alert);
        return new Result(AlertTransition.NONE, alert);
    }

    private Result openNew(
            Long tenantId, Long tenantNodeId, Long datastreamId, ResolvedRule rule, String fingerprint,
            Double value, Instant measuredAt, Instant now) {

        boolean immediate = rule.durationSeconds() <= 0;
        Alert alert = new Alert();
        alert.setTenantId(tenantId);
        alert.setTenantNodeId(tenantNodeId);
        alert.setDatastreamId(datastreamId);
        alert.setRuleId(rule.id());
        alert.setFingerprint(fingerprint);
        alert.setSeverity(rule.severity());
        alert.setThresholdSnapshot(rule.conditions());
        alert.setStartedAt(now);
        alert.setStatus(immediate ? ACTIVE : PENDING);
        alert.setTriggeredAt(immediate ? now : null);
        observe(alert, value, measuredAt);

        try {
            alertRepository.save(alert);
        } catch (DataIntegrityViolationException e) {
            // Hai reading của cùng kênh vào gần như đồng thời — uq_alert_open chỉ cho 1 alert mở.
            // Đọc lại bản kia rồi coi như lượt này chỉ cập nhật giá trị quan sát.
            log.debug("uq_alert_open chặn insert cho fingerprint={}, đọc lại alert đang mở", fingerprint);
            Optional<Alert> existing = alertRepository.findByTenantIdAndFingerprintAndStatusIn(
                    tenantId, fingerprint, OPEN_STATUSES);
            return new Result(AlertTransition.NONE, existing.orElse(null));
        }
        return new Result(immediate ? AlertTransition.ACTIVATED : AlertTransition.NONE, alert);
    }

    private void observe(Alert alert, Double value, Instant measuredAt) {
        alert.setLastObservedValue(value);
        alert.setLastObservedAt(measuredAt);
    }

    public record Result(AlertTransition transition, Alert alert) {
    }
}
