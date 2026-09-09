package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.alert.AlertEvaluationService;
import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.DatastreamRepository;
import com.corp.iot.processing.repository.MetricRepository;
import com.influxdb.client.write.Point;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExternalReadingProcessorTest {

    private static final Instant MEASURED_AT = Instant.parse("2026-08-13T09:41:00Z");

    private TelemetryDedupService dedupService;
    private DatastreamRepository datastreamRepository;
    private MetricRepository metricRepository;
    private InfluxWriterService influxWriterService;
    private RealtimePublisher realtimePublisher;
    private AlertEvaluationService alertEvaluationService;
    private ExternalReadingProcessor processor;

    @BeforeEach
    void setUp() {
        dedupService = mock(TelemetryDedupService.class);
        datastreamRepository = mock(DatastreamRepository.class);
        metricRepository = mock(MetricRepository.class);
        influxWriterService = mock(InfluxWriterService.class);
        realtimePublisher = mock(RealtimePublisher.class);
        alertEvaluationService = mock(AlertEvaluationService.class);
        processor = new ExternalReadingProcessor(dedupService, datastreamRepository, metricRepository,
                influxWriterService, realtimePublisher, alertEvaluationService);

        Datastream datastream = new Datastream();
        datastream.setId(99L);
        datastream.setMetricId(5L);
        datastream.setName("Nhiệt độ thời tiết");
        datastream.setSourceType(SourceType.EXTERNAL_SOURCE_JOB);
        Metric metric = new Metric();
        metric.setId(5L);
        metric.setCode("temperature");
        when(datastreamRepository.findBySourceTypeAndSourceIdAndSourceField(
                eq(SourceType.EXTERNAL_SOURCE_JOB), anyLong(), anyString())).thenReturn(Optional.of(datastream));
        when(metricRepository.findById(5L)).thenReturn(Optional.of(metric));
        when(dedupService.findDuplicates(anyList())).thenReturn(Set.of());
        when(influxWriterService.externalPoint(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Point.measurement("external_reading"));
    }

    private ExternalReadingEvent event(String messageId, boolean backfill) {
        return new ExternalReadingEvent(messageId, 12L, 56L, 7L, "temperature_c", 23.5, MEASURED_AT, backfill);
    }

    @Test
    void luongSongBiChanKhiMessageIdDaThay() {
        when(dedupService.findDuplicates(anyList())).thenReturn(Set.of("msg-1"));

        processor.processBatch(List.of(event("msg-1", false)));

        verify(influxWriterService, never()).externalPoint(any(), any(), any(), any(), any(), any(), any());
    }

    // Đây là lý do cờ backfill tồn tại: những dòng cần vá đã từng bị publish rồi bị vứt vì chưa
    // có kênh, messageId vẫn nằm trong Redis 6 tiếng nên dedup sẽ chặn oan đúng phần lỗ hổng.
    @Test
    void messageBackfillKhongDiQuaDedup() {
        when(dedupService.findDuplicates(anyList())).thenReturn(Set.of("msg-1"));

        processor.processBatch(List.of(event("msg-1", true)));

        // source_field đi kèm để tách hai kênh cùng job cùng metric (xem InfluxWriterService).
        verify(influxWriterService).externalPoint(12L, 56L, 7L, "temperature_c", "temperature", 23.5, MEASURED_AT);
        verify(realtimePublisher).publishExternalReadings(List.of(
                new com.corp.iot.processing.realtime.RealtimePublisher.ExternalReading(
                        12L, 56L, 99L, "temperature", 23.5, MEASURED_AT)));
        // Giá trị của tháng trước không được bắn cảnh báo cho sự cố đã qua từ lâu.
        verify(alertEvaluationService, never()).evaluate(any(), any(), any(), any(), any(), any());
        verify(dedupService).markAll(List.of());
    }

    @Test
    void luongSongVanDanhGiaCanhBaoVaDanhDauDedup() {
        processor.processBatch(List.of(event("msg-1", false)));

        verify(alertEvaluationService).evaluate(eq(12L), eq(56L), any(), eq("temperature"), eq(23.5), eq(MEASURED_AT));
        verify(dedupService).markAll(
                List.of(new TelemetryDedupService.DedupKey(12L, "msg-1")));
    }

    @Test
    void boRiengDongKhongCoKenhConLoVanChay() {
        when(datastreamRepository.findBySourceTypeAndSourceIdAndSourceField(
                eq(SourceType.EXTERNAL_SOURCE_JOB), eq(7L), eq("khong_co_kenh"))).thenReturn(Optional.empty());

        processor.processBatch(List.of(
                new ExternalReadingEvent("msg-1", 12L, 56L, 7L, "khong_co_kenh", 1.0, MEASURED_AT, false),
                event("msg-2", false)));

        verify(influxWriterService).externalPoint(12L, 56L, 7L, "temperature_c", "temperature", 23.5, MEASURED_AT);
        verify(influxWriterService).writePoints(anyList());
    }
}
