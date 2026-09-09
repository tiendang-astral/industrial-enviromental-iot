package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.alert.notify.NotificationDispatcher;
import com.corp.iot.processing.dto.AlertCondition;
import com.corp.iot.processing.dto.AlertConditionGroup;
import com.corp.iot.processing.entity.Alert;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.alert.ChannelRef;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.MetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertEvaluationServiceTest {

    private static final Long TENANT_ID = 8L;
    private static final Long NODE_ID = 15L;
    private static final Instant MEASURED_AT = Instant.parse("2026-09-08T09:41:00Z");

    private AlertRuleResolver resolver;
    private AlertStateMachineService stateMachine;
    private NotificationDispatcher dispatcher;
    private RealtimePublisher realtimePublisher;
    private AlertEvaluationService service;

    @BeforeEach
    void setUp() {
        resolver = mock(AlertRuleResolver.class);
        stateMachine = mock(AlertStateMachineService.class);
        dispatcher = mock(NotificationDispatcher.class);
        realtimePublisher = mock(RealtimePublisher.class);
        MetricRepository metricRepository = mock(MetricRepository.class);

        service = new AlertEvaluationService(resolver, new AlertConditionEvaluator(), stateMachine,
                dispatcher, realtimePublisher, metricRepository);

        when(metricRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(stateMachine.apply(anyLong(), anyLong(), anyLong(), any(), anyBoolean(), any(), any()))
                .thenReturn(new AlertStateMachineService.Result(AlertTransition.NONE, new Alert()));
    }

    private ResolvedRule rule(SourceType sourceType) {
        return new ResolvedRule(7L, "Nhiệt độ cao", "CRITICAL", 0,
                new AlertConditionGroup("OR", List.of(new AlertCondition(">", 32.0))), sourceType);
    }

    private Datastream datastream(SourceType sourceType) {
        Datastream datastream = new Datastream();
        datastream.setId(2L);
        datastream.setMetricId(1L);
        datastream.setName("abcde - Nhiet do");
        datastream.setSourceType(sourceType);
        return datastream;
    }

    private void evaluate(SourceType ruleSource, SourceType datastreamSource) {
        when(resolver.resolve(anyLong(), anyLong(), anyLong(), anyString()))
                .thenReturn(List.of(rule(ruleSource)));
        service.evaluate(TENANT_ID, NODE_ID, ChannelRef.of(datastream(datastreamSource)), "temperature", 34.7, MEASURED_AT);
    }

    @Test
    void ruleKhongGioiHanNguonThiApChoCaHaiLoai() {
        evaluate(null, SourceType.GATEWAY_PIN);
        verify(stateMachine).apply(anyLong(), anyLong(), anyLong(), any(), eq(true), any(), any());

        setUp();
        evaluate(null, SourceType.EXTERNAL_SOURCE_JOB);
        verify(stateMachine).apply(anyLong(), anyLong(), anyLong(), any(), eq(true), any(), any());
    }

    @Test
    void ruleChiGatewayThiBoQuaKenhTuDatabaseNgoai() {
        // Ca thật: nhiệt độ thời tiết ngoài trời không được kích rule "chuồng quá nóng".
        evaluate(SourceType.GATEWAY_PIN, SourceType.EXTERNAL_SOURCE_JOB);

        verify(stateMachine, never()).apply(anyLong(), anyLong(), anyLong(), any(), anyBoolean(), any(), any());
        verify(dispatcher, never()).dispatch(any());
    }

    @Test
    void ruleChiNguonNgoaiThiBoQuaKenhGateway() {
        evaluate(SourceType.EXTERNAL_SOURCE_JOB, SourceType.GATEWAY_PIN);

        verify(stateMachine, never()).apply(anyLong(), anyLong(), anyLong(), any(), anyBoolean(), any(), any());
    }

    @Test
    void ruleKhopLoaiNguonThiVanChayBinhThuong() {
        evaluate(SourceType.GATEWAY_PIN, SourceType.GATEWAY_PIN);

        verify(stateMachine).apply(anyLong(), anyLong(), anyLong(), any(), eq(true), any(), any());
    }

    @Test
    void loiKhiDanhGiaKhongDuocLamHongLuongGhiTelemetry() {
        when(resolver.resolve(anyLong(), anyLong(), anyLong(), anyString()))
                .thenThrow(new RuntimeException("redis + postgres cùng chết"));

        // Không ném ra ngoài: bước này chạy SAU khi số đo đã ghi InfluxDB, ném lên sẽ làm
        // Kafka listener log lỗi cho một message vốn đã xử lý xong phần quan trọng.
        service.evaluate(TENANT_ID, NODE_ID, ChannelRef.of(datastream(SourceType.GATEWAY_PIN)), "temperature", 34.7, MEASURED_AT);
    }
}
