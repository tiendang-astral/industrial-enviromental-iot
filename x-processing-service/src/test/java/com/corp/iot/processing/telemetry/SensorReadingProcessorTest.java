package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.entity.GatewayPin;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.GatewayPinRepository;
import com.corp.iot.processing.repository.GatewayRepository;
import com.corp.iot.processing.repository.MetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SensorReadingProcessorTest {

    private static final SensorReadingEvent EVENT = new SensorReadingEvent(
            "msg-1", 12L, 34L, 56L, "AA:BB:CC:DD:EE:FF", "AI", 1, 23.5, Instant.parse("2026-08-12T09:41:00Z"));

    private TelemetryDedupService dedupService;
    private GatewayPinRepository gatewayPinRepository;
    private MetricRepository metricRepository;
    private GatewayRepository gatewayRepository;
    private InfluxWriterService influxWriterService;
    private RealtimePublisher realtimePublisher;
    private SensorReadingProcessor processor;

    @BeforeEach
    void setUp() {
        dedupService = mock(TelemetryDedupService.class);
        gatewayPinRepository = mock(GatewayPinRepository.class);
        metricRepository = mock(MetricRepository.class);
        gatewayRepository = mock(GatewayRepository.class);
        influxWriterService = mock(InfluxWriterService.class);
        realtimePublisher = mock(RealtimePublisher.class);
        processor = new SensorReadingProcessor(
                dedupService, gatewayPinRepository, metricRepository, gatewayRepository,
                influxWriterService, realtimePublisher);

        when(dedupService.markIfNew(EVENT.tenantId(), EVENT.messageId())).thenReturn(true);
    }

    @Test
    void skipsDuplicateMessage() {
        when(dedupService.markIfNew(EVENT.tenantId(), EVENT.messageId())).thenReturn(false);

        processor.process(EVENT);

        verify(gatewayPinRepository, never()).findByGatewayIdAndTypeAndPinNumberAndDirection(
                anyLong(), any(), any(), any());
        verify(influxWriterService, never()).writeSensorReading(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsWhenPinNotFound() {
        when(gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(34L, "AI", 1, "INPUT"))
                .thenReturn(Optional.empty());

        processor.process(EVENT);

        verify(influxWriterService, never()).writeSensorReading(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsWhenPinDisabled() {
        GatewayPin pin = pin(false, 99L);
        when(gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(34L, "AI", 1, "INPUT"))
                .thenReturn(Optional.of(pin));

        processor.process(EVENT);

        verify(influxWriterService, never()).writeSensorReading(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsWhenMetricNotFound() {
        GatewayPin pin = pin(true, 99L);
        when(gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(34L, "AI", 1, "INPUT"))
                .thenReturn(Optional.of(pin));
        when(metricRepository.findById(99L)).thenReturn(Optional.empty());

        processor.process(EVENT);

        verify(influxWriterService, never()).writeSensorReading(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void writesInfluxTouchesGatewayAndPublishesRealtimeOnHappyPath() {
        GatewayPin pin = pin(true, 99L);
        Metric metric = new Metric();
        metric.setId(99L);
        metric.setCode("temperature");
        when(gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(34L, "AI", 1, "INPUT"))
                .thenReturn(Optional.of(pin));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric));

        processor.process(EVENT);

        verify(influxWriterService).writeSensorReading(12L, 56L, 34L, "temperature", "AI", 1, 23.5, EVENT.measuredAt());
        verify(gatewayRepository, times(1)).touchLastSeenAt(eq(34L), any(Instant.class));
        verify(realtimePublisher).publishSensorReading(12L, 56L, 34L, "temperature", "AI", 1, 23.5, EVENT.measuredAt());
    }

    private GatewayPin pin(boolean enabled, Long metricId) {
        GatewayPin pin = new GatewayPin();
        pin.setId(1L);
        pin.setGatewayId(34L);
        pin.setType("AI");
        pin.setPinNumber(1);
        pin.setDirection("INPUT");
        pin.setEnabled(enabled);
        pin.setMetricId(metricId);
        return pin;
    }
}
