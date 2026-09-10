package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.dto.AlertCondition;
import com.corp.iot.processing.dto.AlertConditionGroup;
import com.corp.iot.processing.entity.Alert;
import com.corp.iot.processing.repository.AlertRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertStateMachineServiceTest {

    private static final Long TENANT_ID = 12L;
    private static final Long NODE_ID = 56L;
    private static final Long DATASTREAM_ID = 99L;
    private static final Instant MEASURED_AT = Instant.parse("2026-09-08T09:41:00Z");

    private AlertRepository alertRepository;
    private AlertStateMachineService service;

    @BeforeEach
    void setUp() {
        alertRepository = mock(AlertRepository.class);
        service = new AlertStateMachineService(alertRepository);
        when(alertRepository.findByTenantIdAndFingerprintAndStatusIn(anyLong(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private ResolvedRule rule(int durationSeconds) {
        return new ResolvedRule(7L, "Nhiệt độ cao", "CRITICAL", durationSeconds,
                new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))), null, null, null);
    }

    private AlertStateMachineService.Result apply(ResolvedRule rule, boolean violated) {
        return service.apply(TENANT_ID, NODE_ID, DATASTREAM_ID, rule, violated, 38.5, MEASURED_AT);
    }

    private void openAlertIs(String status, Instant startedAt) {
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTenantId(TENANT_ID);
        alert.setRuleId(7L);
        alert.setStatus(status);
        alert.setStartedAt(startedAt);
        when(alertRepository.findByTenantIdAndFingerprintAndStatusIn(
                anyLong(), anyString(), any())).thenReturn(Optional.of(alert));
    }

    @Test
    void durationBangKhongThiViPhamDauTienLenThangActive() {
        AlertStateMachineService.Result result = apply(rule(0), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.ACTIVATED);
        ArgumentCaptor<Alert> saved = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo("ACTIVE");
        assertThat(saved.getValue().getTriggeredAt()).isNotNull();
        assertThat(saved.getValue().getFingerprint()).isEqualTo("7:99");
        assertThat(saved.getValue().getThresholdSnapshot().conditions()).hasSize(1);
    }

    @Test
    void durationLonHonKhongThiViPhamDauTienChiTaoPending() {
        AlertStateMachineService.Result result = apply(rule(300), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.NONE);
        ArgumentCaptor<Alert> saved = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(saved.getValue().getTriggeredAt()).isNull();
    }

    @Test
    void pendingChuaDuDurationThiVanGiuPending() {
        openAlertIs("PENDING", Instant.now().minus(10, ChronoUnit.SECONDS));

        AlertStateMachineService.Result result = apply(rule(300), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.NONE);
        assertThat(result.alert().getStatus()).isEqualTo("PENDING");
        assertThat(result.alert().getLastObservedValue()).isEqualTo(38.5);
    }

    @Test
    void pendingDuDurationThiChuyenActive() {
        openAlertIs("PENDING", Instant.now().minus(10, ChronoUnit.MINUTES));

        AlertStateMachineService.Result result = apply(rule(300), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.ACTIVATED);
        assertThat(result.alert().getStatus()).isEqualTo("ACTIVE");
        assertThat(result.alert().getTriggeredAt()).isNotNull();
    }

    @Test
    void hetViPhamKhiDangActiveThiChuyenRecoveredVaBao() {
        openAlertIs("ACTIVE", Instant.now().minus(10, ChronoUnit.MINUTES));

        AlertStateMachineService.Result result = apply(rule(300), false);

        assertThat(result.transition()).isEqualTo(AlertTransition.RECOVERED);
        assertThat(result.alert().getStatus()).isEqualTo("RECOVERED");
        assertThat(result.alert().getRecoveredAt()).isNotNull();
    }

    @Test
    void hetViPhamKhiConPendingThiDongLangLeKhongBao() {
        openAlertIs("PENDING", Instant.now().minus(10, ChronoUnit.SECONDS));

        AlertStateMachineService.Result result = apply(rule(300), false);

        // Chưa từng gửi cảnh báo cho ai thì không cần gửi "đã hết".
        assertThat(result.transition()).isEqualTo(AlertTransition.NONE);
        assertThat(result.alert().getStatus()).isEqualTo("RECOVERED");
    }

    @Test
    void khongViPhamVaKhongCoAlertMoThiKhongGhiGi() {
        AlertStateMachineService.Result result = apply(rule(0), false);

        assertThat(result.transition()).isEqualTo(AlertTransition.NONE);
        verify(alertRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void viPhamLanHaiSauKhiDaRecoveredThiTaoAlertMoi() {
        // Alert cũ đã RECOVERED nên không nằm trong tập "đang mở" — uq_alert_open không chặn.
        AlertStateMachineService.Result result = apply(rule(0), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.ACTIVATED);
        ArgumentCaptor<Alert> saved = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNull();
    }

    @Test
    void dungUqAlertOpenThiDocLaiBanKiaThayViNemLoi() {
        Alert existing = new Alert();
        existing.setId(1L);
        existing.setStatus("ACTIVE");
        existing.setStartedAt(Instant.now());
        when(alertRepository.save(any(Alert.class))).thenThrow(new DataIntegrityViolationException("uq_alert_open"));
        when(alertRepository.findByTenantIdAndFingerprintAndStatusIn(anyLong(), anyString(), any()))
                .thenReturn(Optional.empty(), Optional.of(existing));

        AlertStateMachineService.Result result = apply(rule(0), true);

        assertThat(result.transition()).isEqualTo(AlertTransition.NONE);
        assertThat(result.alert()).isSameAs(existing);
    }
}
