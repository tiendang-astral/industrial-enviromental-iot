package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.alert.AlertEvaluationService;
import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.alert.AlertRuleResolver.RuleKey;
import com.corp.iot.processing.telemetry.PinResolverService.PinKey;
import com.corp.iot.processing.telemetry.TelemetryDedupService.DedupKey;
import com.influxdb.client.write.Point;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SensorReadingProcessorTest {

    private static final Instant MEASURED_AT = Instant.parse("2026-08-12T09:41:00Z");

    private TelemetryDedupService dedupService;
    private PinResolverService pinResolverService;
    private InfluxWriterService influxWriterService;
    private GatewayLastSeenService gatewayLastSeenService;
    private RealtimePublisher realtimePublisher;
    private AlertEvaluationService alertEvaluationService;
    private SensorReadingProcessor processor;

    @BeforeEach
    void setUp() {
        dedupService = mock(TelemetryDedupService.class);
        pinResolverService = mock(PinResolverService.class);
        influxWriterService = mock(InfluxWriterService.class);
        gatewayLastSeenService = mock(GatewayLastSeenService.class);
        realtimePublisher = mock(RealtimePublisher.class);
        alertEvaluationService = mock(AlertEvaluationService.class);
        processor = new SensorReadingProcessor(dedupService, pinResolverService, influxWriterService,
                gatewayLastSeenService, realtimePublisher, alertEvaluationService);

        when(dedupService.findDuplicates(anyList())).thenReturn(Set.of());
        when(influxWriterService.sensorPoint(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Point.measurement("sensor_reading"));
        when(pinResolverService.resolveAll(anyList())).thenAnswer(inv -> {
            List<PinKey> keys = inv.getArgument(0);
            return keys.stream().distinct().collect(java.util.stream.Collectors.toMap(k -> k, k -> pin(true, 99L)));
        });
        when(alertEvaluationService.prefetchRules(anyList())).thenAnswer(inv -> {
            List<RuleKey> keys = inv.getArgument(0);
            return keys.stream().distinct().collect(java.util.stream.Collectors.toMap(k -> k, k -> List.<ResolvedRule>of()));
        });
    }

    private SensorReadingEvent event(String messageId, int pinNumber, double value) {
        return new SensorReadingEvent(messageId, 12L, 34L, 56L, "AA:BB:CC:DD:EE:FF", "AI", pinNumber, value, MEASURED_AT);
    }

    private ResolvedPin pin(boolean enabled, Long datastreamId) {
        return new ResolvedPin(1L, "temperature", 5L, enabled, datastreamId, "Nhiệt độ chuồng 1");
    }

    @Test
    void ghiInfluxChamGatewayVaPublishRealtimeOHappyPath() {
        processor.processBatch(List.of(event("msg-1", 1, 23.5)));

        verify(influxWriterService).sensorPoint(12L, 56L, 34L, "temperature", "AI", 1, 23.5, MEASURED_AT);
        verify(influxWriterService).writePoints(anyList());
        verify(gatewayLastSeenService).touch(34L);
        verify(realtimePublisher).publishSensorReadings(List.of(new RealtimePublisher.SensorReading(
                12L, 56L, 34L, "temperature", "AI", 1, 23.5, MEASURED_AT)));
        verify(alertEvaluationService).evaluateWith(eq(12L), eq(56L), any(), eq("temperature"), eq(23.5), eq(MEASURED_AT), any());
    }

    @Test
    void boQuaMessageTrungTrongLoNhungVanXuLyPhanConLai() {
        when(dedupService.findDuplicates(anyList())).thenReturn(Set.of("msg-1"));

        processor.processBatch(List.of(event("msg-1", 1, 23.5), event("msg-2", 2, 24.5)));

        verify(influxWriterService, never()).sensorPoint(any(), any(), any(), any(), any(), eq(1), any(), any());
        verify(influxWriterService).sensorPoint(12L, 56L, 34L, "temperature", "AI", 2, 24.5, MEASURED_AT);
    }

    @Test
    void boRiengSoDoKhongResolveDuocPinConLoVanChay() {
        when(pinResolverService.resolveAll(anyList())).thenReturn(
                Map.of(new PinKey(34L, "AI", 2), pin(true, 99L)));   // AI:1 không resolve được

        processor.processBatch(List.of(event("msg-1", 1, 23.5), event("msg-2", 2, 24.5)));

        verify(influxWriterService).sensorPoint(12L, 56L, 34L, "temperature", "AI", 2, 24.5, MEASURED_AT);
        ArgumentCaptor<List<Point>> captor = pointsCaptor();
        verify(influxWriterService).writePoints(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }

    @Test
    void pinTatThiKhongGhi() {
        when(pinResolverService.resolveAll(anyList())).thenAnswer(inv -> {
            List<PinKey> keys = inv.getArgument(0);
            return keys.stream().distinct().collect(java.util.stream.Collectors.toMap(k -> k, k -> pin(false, 99L)));
        });

        processor.processBatch(List.of(event("msg-1", 1, 23.5)));

        verify(influxWriterService, never()).sensorPoint(any(), any(), any(), any(), any(), any(), any(), any());
    }

    // Đây là lý do dedup phải đánh dấu SAU khi ghi: Influx lỗi mà đã đánh dấu thì lần retry bị
    // chặn oan và mất nguyên lô trong 6 tiếng.
    @Test
    void influxLoiThiKhongDanhDauDedupDeRetryLayLaiDuoc() {
        org.mockito.Mockito.doThrow(new RuntimeException("influx down"))
                .when(influxWriterService).writePoints(anyList());

        assertThatThrownBy(() -> processor.processBatch(List.of(event("msg-1", 1, 23.5))))
                .isInstanceOf(RuntimeException.class);

        verify(dedupService, never()).markAll(anyList());
        verify(realtimePublisher, never()).publishSensorReadings(anyList());
    }

    @Test
    void danhDauDedupSauKhiGhiThanhCong() {
        processor.processBatch(List.of(event("msg-1", 1, 23.5)));

        InOrder order = inOrder(influxWriterService, dedupService);
        order.verify(influxWriterService).writePoints(anyList());
        order.verify(dedupService).markAll(List.of(new DedupKey(12L, "msg-1")));
    }

    // AlertStateMachineService dựa trên chuỗi giá trị liên tiếp của từng kênh (PENDING -> ACTIVE
    // sau khi vi phạm đủ duration_seconds), nên thứ tự trong lô không được xáo.
    @Test
    void danhGiaCanhBaoGiuNguyenThuTuTrongLo() {
        processor.processBatch(List.of(event("msg-1", 1, 20.0), event("msg-2", 1, 30.0), event("msg-3", 1, 40.0)));

        InOrder order = inOrder(alertEvaluationService);
        order.verify(alertEvaluationService).evaluateWith(any(), any(), any(), any(), eq(20.0), any(), any());
        order.verify(alertEvaluationService).evaluateWith(any(), any(), any(), any(), eq(30.0), any(), any());
        order.verify(alertEvaluationService).evaluateWith(any(), any(), any(), any(), eq(40.0), any(), any());
    }

    // Chân còn nhưng kênh dữ liệu đã bị xoá: vẫn ghi số đo, chỉ không có gì để so ngưỡng.
    @Test
    void khongCoKenhThiVanGhiNhungKhongDanhGiaCanhBao() {
        when(pinResolverService.resolveAll(anyList())).thenAnswer(inv -> {
            List<PinKey> keys = inv.getArgument(0);
            return keys.stream().distinct().collect(java.util.stream.Collectors.toMap(k -> k, k -> pin(true, null)));
        });

        processor.processBatch(List.of(event("msg-1", 1, 23.5)));

        verify(influxWriterService).writePoints(anyList());
        verify(alertEvaluationService, never()).evaluateWith(any(), any(), any(), any(), any(), any(), any());
    }

    // 8 chân của cùng 1 gateway trong 1 lô -> 1 lần chạm last_seen_at, không phải 8.
    @Test
    void chiChamLastSeenMotLanChoMoiGatewayTrongLo() {
        processor.processBatch(List.of(event("msg-1", 1, 23.5), event("msg-2", 2, 24.5), event("msg-3", 3, 25.5)));

        verify(gatewayLastSeenService).touch(34L);
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<List<Point>> pointsCaptor() {
        return ArgumentCaptor.forClass(List.class);
    }
}
