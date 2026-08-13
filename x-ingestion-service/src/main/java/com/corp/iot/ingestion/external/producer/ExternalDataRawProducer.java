package com.corp.iot.ingestion.external.producer;

import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExternalDataRawProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topic.external-data-raw}")
    private String topic;

    public void send(ExternalReadingEvent event, String correlationId) {
        String key = event.tenantId() + ":" + event.externalSourceJobId();
        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JacksonException e) {
            log.error("Failed to serialize ExternalReadingEvent messageId={}", event.messageId(), e);
            return;
        }

        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, payload);
        record.headers().add(new RecordHeader("correlation_id", correlationId.getBytes(StandardCharsets.UTF_8)));
        kafkaTemplate.send(record);
    }
}
