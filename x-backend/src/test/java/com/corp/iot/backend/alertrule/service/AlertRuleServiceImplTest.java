package com.corp.iot.backend.alertrule.service;

import com.corp.iot.backend.alert.service.AlertClosingService;
import com.corp.iot.backend.alertrule.dto.AlertChannelRequest;
import com.corp.iot.backend.alertrule.dto.AlertCondition;
import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.alertrule.dto.CreateAlertRuleRequest;
import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleRequest;
import com.corp.iot.backend.alertrule.entity.AlertChannel;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import com.corp.iot.backend.alertrule.entity.ChannelType;
import com.corp.iot.backend.alertrule.mapper.AlertRuleMapper;
import com.corp.iot.backend.alertrule.repository.AlertChannelRepository;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertRuleServiceImplTest {

    private AlertRuleRepository alertRuleRepository;
    private AlertChannelRepository alertChannelRepository;
    private AlertRuleCacheEvictor alertRuleCacheEvictor;
    private AlertRuleServiceImpl service;

    @BeforeEach
    void setUp() {
        alertRuleRepository = mock(AlertRuleRepository.class);
        alertChannelRepository = mock(AlertChannelRepository.class);
        MetricRepository metricRepository = mock(MetricRepository.class);
        TenantNodeRepository tenantNodeRepository = mock(TenantNodeRepository.class);
        alertRuleCacheEvictor = mock(AlertRuleCacheEvictor.class);
        ScopeService scopeService = mock(ScopeService.class);

        service = new AlertRuleServiceImpl(alertRuleRepository, alertChannelRepository, metricRepository,
                tenantNodeRepository, new AlertRuleMapper(), alertRuleCacheEvictor, scopeService,
                new AlertConditionValidator(), mock(AlertClosingService.class));

        Metric metric = new Metric();
        metric.setId(5L);
        metric.setCode("temperature");
        metric.setUnit("°C");
        when(metricRepository.existsById(5L)).thenReturn(true);
        when(metricRepository.findById(5L)).thenReturn(Optional.of(metric));
        when(tenantNodeRepository.findById(56L)).thenReturn(Optional.of(new TenantNode()));
        when(alertRuleRepository.save(any(AlertRule.class))).thenAnswer(invocation -> {
            AlertRule rule = invocation.getArgument(0);
            if (rule.getId() == null) {
                rule.setId(7L);
            }
            return rule;
        });
        when(alertChannelRepository.findByAlertRuleId(anyLong())).thenReturn(List.of());
    }

    private static AlertConditionGroup or(AlertCondition... conditions) {
        return new AlertConditionGroup("OR", List.of(conditions));
    }

    private AlertChannelRequest email() {
        return new AlertChannelRequest(ChannelType.EMAIL, "Trực ca", "truc@corp.vn", null);
    }

    private CreateAlertRuleRequest createRequest(AlertConditionGroup conditions, List<AlertChannelRequest> channels) {
        return new CreateAlertRuleRequest(56L, "Nhiệt độ cao", 5L, AlertSeverity.CRITICAL, conditions, 300, channels);
    }

    @Test
    void taoRuleGhiDungCauHinhVaXoaCache() {
        service.create(createRequest(or(new AlertCondition(">", 35.0)), List.of(email())));

        ArgumentCaptor<AlertRule> saved = ArgumentCaptor.forClass(AlertRule.class);
        verify(alertRuleRepository).save(saved.capture());
        assertThat(saved.getValue().getTenantNodeId()).isEqualTo(56L);
        assertThat(saved.getValue().getDurationSeconds()).isEqualTo(300);
        assertThat(saved.getValue().isEnabled()).isTrue();
        verify(alertRuleCacheEvictor).evict(any(AlertRule.class));
    }

    @Test
    void toanTuKhongHopLeBiChan() {
        assertThatThrownBy(() -> service.create(
                createRequest(or(new AlertCondition("!=", 35.0)), List.of(email()))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_CONDITION");
    }

    @Test
    void nguongNullBiChan() {
        assertThatThrownBy(() -> service.create(
                createRequest(or(new AlertCondition(">", null)), List.of(email()))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_CONDITION");
    }

    @Test
    void kenhTelegramThieuTokenBiChan() {
        AlertChannelRequest telegram = new AlertChannelRequest(ChannelType.TELEGRAM, "Nhóm trực", "-100123", null);

        assertThatThrownBy(() -> service.create(
                createRequest(or(new AlertCondition(">", 35.0)), List.of(telegram))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "TELEGRAM_TOKEN_REQUIRED");
    }

    @Test
    void suaRuleThayTheToanBoKenhChuKhongMerge() {
        AlertRule existing = new AlertRule();
        existing.setId(7L);
        existing.setTenantNodeId(56L);
        existing.setMetricId(5L);
        existing.setConditions(or(new AlertCondition(">", 35.0)));
        when(alertRuleRepository.findById(7L)).thenReturn(Optional.of(existing));

        service.update(7L, new UpdateAlertRuleRequest("Nhiệt độ cao", AlertSeverity.WARNING,
                or(new AlertCondition(">", 40.0)), 60, List.of(email())));

        verify(alertChannelRepository).deleteByAlertRuleId(7L);
        ArgumentCaptor<AlertChannel> saved = ArgumentCaptor.forClass(AlertChannel.class);
        verify(alertChannelRepository).save(saved.capture());
        assertThat(saved.getValue().getAddress()).isEqualTo("truc@corp.vn");
        assertThat(existing.getSeverity()).isEqualTo(AlertSeverity.WARNING);
        assertThat(existing.getDurationSeconds()).isEqualTo(60);
    }

    @Test
    void kenhTrungLoaiVaDiaChiChiGhiMotLan() {
        AlertChannelRequest trung = new AlertChannelRequest(ChannelType.EMAIL, "Khác tên", "TRUC@corp.vn", null);

        service.create(createRequest(or(new AlertCondition(">", 35.0)), List.of(email(), trung)));

        // uq_alert_channel là (rule, loại, địa chỉ) — ghi cả 2 sẽ vỡ constraint.
        verify(alertChannelRepository, org.mockito.Mockito.times(1)).save(any(AlertChannel.class));
    }

    @Test
    void xoaRuleLaSoftDeleteVaDonKenh() {
        AlertRule existing = new AlertRule();
        existing.setId(7L);
        existing.setTenantNodeId(56L);
        existing.setMetricId(5L);
        when(alertRuleRepository.findById(7L)).thenReturn(Optional.of(existing));

        service.delete(7L);

        assertThat(existing.getDeletedAt()).isNotNull();
        verify(alertChannelRepository).deleteByAlertRuleId(7L);
        verify(alertRuleCacheEvictor).evict(existing);
    }
}
