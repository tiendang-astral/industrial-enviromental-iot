package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.telemetry.ExternalReadingProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

// Consume topic external-data-raw. Lỗi parse/xử lý log + skip, KHÔNG throw ra ngoài thread
// pool (CONVENTIONS.md § Error handling — async listener) — chưa có DLQ topic, để Phase 9.
@Slf4j
@Component
@RequiredArgsConstructor
public class ExternalDataRawListener {

    private final ObjectMapper objectMapper;
    private final ExternalReadingProcessor externalReadingProcessor;

    @KafkaListener(topics = "${app.kafka.topic.external-data-raw}")
    public void onMessage(String payload) {
        ExternalReadingEvent event;
        try {
            event = objectMapper.readValue(payload, ExternalReadingEvent.class);
        } catch (Exception e) {
            log.error("Failed to parse external-data-raw payload={}", payload, e);
            return;
        }

        try {
            externalReadingProcessor.process(event);
        } catch (Exception e) {
            log.error("Failed to process external reading messageId={}", event.messageId(), e);
        }
    }
}
