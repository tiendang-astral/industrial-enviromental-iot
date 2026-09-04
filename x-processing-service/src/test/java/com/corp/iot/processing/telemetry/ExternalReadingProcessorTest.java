package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.DatastreamRepository;
import com.corp.iot.processing.repository.MetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
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
    private ExternalReadingProcessor processor;

    @BeforeEach
    void setUp() {
        dedupService = mock(TelemetryDedupService.class);
        datastreamRepository = mock(DatastreamRepository.class);
        metricRepository = mock(MetricRepository.class);
        influxWriterService = mock(InfluxWriterService.class);
        realtimePublisher = mock(RealtimePublisher.class);
        processor = new ExternalReadingProcessor(dedupService, datastreamRepository, metricRepository,
                influxWriterService, realtimePublisher);

        Datastream datastream = new Datastream();
        datastream.setId(99L);
        datastream.setMetricId(5L);
        Metric metric = new Metric();
        metric.setId(5L);
        metric.setCode("temperature");
        when(datastreamRepository.findBySourceTypeAndSourceIdAndSourceField(
                eq(SourceType.EXTERNAL_SOURCE_JOB), anyLong(), anyString())).thenReturn(Optional.of(datastream));
        when(metricRepository.findById(5L)).thenReturn(Optional.of(metric));
    }

    private ExternalReadingEvent event(boolean backfill) {
        return new ExternalReadingEvent("msg-1", 12L, 56L, 7L, "temperature_c", 23.5, MEASURED_AT, backfill);
    }

    @Test
    void luongSongBiChanKhiMessageIdDaThay() {
        when(dedupService.markIfNew(12L, "msg-1")).thenReturn(false);

        processor.process(event(false));

        verify(influxWriterService, never())
                .writeExternalReading(anyLong(), anyLong(), anyLong(), anyString(), anyString(), any(), any());
    }

    // Đây là lý do cờ backfill tồn tại: những dòng cần vá đã từng bị publish rồi bị vứt vì chưa
    // có kênh, messageId vẫn nằm trong Redis 6 tiếng nên dedup sẽ chặn oan đúng phần lỗ hổng.
    @Test
    void messageBackfillKhongDiQuaDedup() {
        when(dedupService.markIfNew(anyLong(), anyString())).thenReturn(false);

        processor.process(event(true));

        verify(dedupService, never()).markIfNew(anyLong(), anyString());
        // source_field đi kèm để tách hai kênh cùng job cùng metric (xem InfluxWriterService).
        verify(influxWriterService).writeExternalReading(12L, 56L, 7L, "temperature_c", "temperature", 23.5, MEASURED_AT);
        verify(realtimePublisher).publishExternalReading(12L, 56L, 99L, "temperature", 23.5, MEASURED_AT);
    }
}
