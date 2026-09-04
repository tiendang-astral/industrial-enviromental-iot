package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.telemetry.ExternalReadingProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

// Contract test đối xứng với ExternalDataRawProducerContractTest ở x-ingestion-service —
// cùng JSON canonical theo ARCHITECTURE.md § Flow: External source data. Không có DTO dùng
// chung (CONVENTIONS.md), nên test này là nguồn phát hiện lệch field giữa 2 service.
class ExternalDataRawListenerContractTest {

    private static final String CANONICAL_JSON = """
            {
              "messageId": "abc123",
              "tenantId": 12,
              "tenantNodeId": 56,
              "externalSourceJobId": 7,
              "sourceField": "temperature_c",
              "value": 23.5,
              "measuredAt": "2026-08-13T09:41:00Z",
              "backfill": false
            }
            """;

    private ExternalReadingProcessor processor;
    private ExternalDataRawListener listener;

    @BeforeEach
    void setUp() {
        processor = mock(ExternalReadingProcessor.class);
        listener = new ExternalDataRawListener(new ObjectMapper(), processor);
    }

    @Test
    void parsesCanonicalIngestionPayloadIntoExpectedEvent() {
        listener.onMessage(CANONICAL_JSON);

        ArgumentCaptor<ExternalReadingEvent> captor = ArgumentCaptor.forClass(ExternalReadingEvent.class);
        verify(processor).process(captor.capture());
        ExternalReadingEvent event = captor.getValue();

        assertThat(event.messageId()).isEqualTo("abc123");
        assertThat(event.tenantId()).isEqualTo(12L);
        assertThat(event.tenantNodeId()).isEqualTo(56L);
        assertThat(event.externalSourceJobId()).isEqualTo(7L);
        assertThat(event.sourceField()).isEqualTo("temperature_c");
        assertThat(event.value()).isEqualTo(23.5);
        assertThat(event.measuredAt()).isEqualTo(Instant.parse("2026-08-13T09:41:00Z"));
        assertThat(event.backfill()).isFalse();
    }

    // Message do bản ingestion cũ (trước V13) ghi vào topic không có field này — phải parse
    // được và mặc định là luồng sống, không phải backfill.
    @Test
    void payloadCuKhongCoCoBackfillVanParseDuoc() {
        listener.onMessage(CANONICAL_JSON.replace(",\n              \"backfill\": false", ""));

        ArgumentCaptor<ExternalReadingEvent> captor = ArgumentCaptor.forClass(ExternalReadingEvent.class);
        verify(processor).process(captor.capture());

        assertThat(captor.getValue().backfill()).isFalse();
    }
}
