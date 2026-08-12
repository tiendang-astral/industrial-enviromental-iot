package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.telemetry.SensorReadingProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

// Contract test đối xứng với SensorDataRawProducerContractTest ở x-ingestion-service —
// cùng JSON canonical theo ARCHITECTURE.md § Flow: Gateway sensor data. Không có DTO
// dùng chung (CONVENTIONS.md), nên test này là nguồn phát hiện lệch field giữa 2 service.
class SensorDataRawListenerContractTest {

    private static final String CANONICAL_JSON = """
            {
              "messageId": "abc123",
              "tenantId": 12,
              "gatewayId": 34,
              "tenantNodeId": 56,
              "macAddress": "AA:BB:CC:DD:EE:FF",
              "pinType": "AI",
              "pinNumber": 1,
              "value": 23.5,
              "measuredAt": "2026-08-12T09:41:00Z"
            }
            """;

    private SensorReadingProcessor processor;
    private SensorDataRawListener listener;

    @BeforeEach
    void setUp() {
        processor = mock(SensorReadingProcessor.class);
        listener = new SensorDataRawListener(new ObjectMapper(), processor);
    }

    @Test
    void parsesCanonicalIngestionPayloadIntoExpectedEvent() {
        listener.onMessage(CANONICAL_JSON);

        ArgumentCaptor<SensorReadingEvent> captor = ArgumentCaptor.forClass(SensorReadingEvent.class);
        verify(processor).process(captor.capture());
        SensorReadingEvent event = captor.getValue();

        assertThat(event.messageId()).isEqualTo("abc123");
        assertThat(event.tenantId()).isEqualTo(12L);
        assertThat(event.gatewayId()).isEqualTo(34L);
        assertThat(event.tenantNodeId()).isEqualTo(56L);
        assertThat(event.macAddress()).isEqualTo("AA:BB:CC:DD:EE:FF");
        assertThat(event.pinType()).isEqualTo("AI");
        assertThat(event.pinNumber()).isEqualTo(1);
        assertThat(event.value()).isEqualTo(23.5);
        assertThat(event.measuredAt()).isEqualTo(Instant.parse("2026-08-12T09:41:00Z"));
    }

    @Test
    void malformedJsonIsLoggedAndSkippedNotThrown() {
        listener.onMessage("{not-valid-json");

        verify(processor, never()).process(any());
    }
}
