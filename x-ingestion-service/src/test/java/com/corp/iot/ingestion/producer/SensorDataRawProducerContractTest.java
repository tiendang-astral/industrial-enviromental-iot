package com.corp.iot.ingestion.producer;

import com.corp.iot.ingestion.dto.SensorReadingEvent;
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
// (xem ARCHITECTURE.md § Flow: Gateway sensor data — contract Kafka sensor-data-raw).
// Đổi field ở SensorReadingEvent bắt buộc sync lại bản sao ở x-processing-service +
// test tương ứng (SensorDataRawListenerContractTest).
class SensorDataRawProducerContractTest {

    @SuppressWarnings("unchecked")
    @Test
    void producesJsonMatchingProcessingServiceContract() throws Exception {
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        SensorDataRawProducer producer = new SensorDataRawProducer(kafkaTemplate, objectMapper);
        ReflectionTestUtils.setField(producer, "topic", "sensor-data-raw");

        SensorReadingEvent event = new SensorReadingEvent(
                "abc123", 12L, 34L, 56L, "AA:BB:CC:DD:EE:FF", "AI", 1, 23.5, Instant.parse("2026-08-12T09:41:00Z"));
        producer.send(event, "corr-1");

        ArgumentCaptor<ProducerRecord> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());
        ProducerRecord<String, String> record = captor.getValue();

        assertThat(record.topic()).isEqualTo("sensor-data-raw");
        assertThat(record.key()).isEqualTo("12:34");

        Header header = record.headers().lastHeader("correlation_id");
        assertThat(header).isNotNull();
        assertThat(new String(header.value(), StandardCharsets.UTF_8)).isEqualTo("corr-1");

        JsonNode json = objectMapper.readTree(record.value());
        assertThat(json.get("messageId").asText()).isEqualTo("abc123");
        assertThat(json.get("tenantId").asLong()).isEqualTo(12L);
        assertThat(json.get("gatewayId").asLong()).isEqualTo(34L);
        assertThat(json.get("tenantNodeId").asLong()).isEqualTo(56L);
        assertThat(json.get("macAddress").asText()).isEqualTo("AA:BB:CC:DD:EE:FF");
        assertThat(json.get("pinType").asText()).isEqualTo("AI");
        assertThat(json.get("pinNumber").asInt()).isEqualTo(1);
        assertThat(json.get("value").asDouble()).isEqualTo(23.5);
        assertThat(json.has("measuredAt")).isTrue();
    }
}
