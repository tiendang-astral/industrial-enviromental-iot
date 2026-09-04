package com.corp.iot.ingestion.external.producer;

import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

// Contract test: khoá đúng field name/type mà x-processing-service phụ thuộc để parse
// (xem ARCHITECTURE.md § Flow: External source data — contract Kafka external-data-raw).
// Đổi field ở ExternalReadingEvent bắt buộc sync lại bản sao ở x-processing-service +
// test tương ứng (ExternalDataRawListenerContractTest).
class ExternalDataRawProducerContractTest {

    @SuppressWarnings("unchecked")
    @Test
    void producesJsonMatchingProcessingServiceContract() {
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        ExternalDataRawProducer producer = new ExternalDataRawProducer(kafkaTemplate, objectMapper);
        ReflectionTestUtils.setField(producer, "topic", "external-data-raw");

        ExternalReadingEvent event = new ExternalReadingEvent(
                "abc123", 12L, 56L, 7L, "temperature_c", 23.5, Instant.parse("2026-08-13T09:41:00Z"), false);
        producer.send(event, "corr-1");

        ArgumentCaptor<ProducerRecord> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());
        ProducerRecord<String, String> record = captor.getValue();

        assertThat(record.topic()).isEqualTo("external-data-raw");
        assertThat(record.key()).isEqualTo("12:7");

        Header header = record.headers().lastHeader("correlation_id");
        assertThat(header).isNotNull();
        assertThat(new String(header.value(), StandardCharsets.UTF_8)).isEqualTo("corr-1");

        JsonNode json = objectMapper.readTree(record.value());
        assertThat(json.get("messageId").asText()).isEqualTo("abc123");
        assertThat(json.get("tenantId").asLong()).isEqualTo(12L);
        assertThat(json.get("tenantNodeId").asLong()).isEqualTo(56L);
        assertThat(json.get("externalSourceJobId").asLong()).isEqualTo(7L);
        assertThat(json.get("sourceField").asText()).isEqualTo("temperature_c");
        assertThat(json.get("value").asDouble()).isEqualTo(23.5);
        assertThat(json.has("measuredAt")).isTrue();
        assertThat(json.get("backfill").asBoolean()).isFalse();
    }

    @SuppressWarnings("unchecked")
    @Test
    void danhDauBackfillTrongPayloadDeProcessingBoQuaDedup() {
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        ExternalDataRawProducer producer = new ExternalDataRawProducer(kafkaTemplate, objectMapper);
        ReflectionTestUtils.setField(producer, "topic", "external-data-raw");

        producer.send(new ExternalReadingEvent(
                "abc123", 12L, 56L, 7L, "temperature_c", 23.5, Instant.parse("2026-08-13T09:41:00Z"), true), "corr-1");

        ArgumentCaptor<ProducerRecord> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        assertThat(objectMapper.readTree((String) captor.getValue().value()).get("backfill").asBoolean()).isTrue();
    }
}
