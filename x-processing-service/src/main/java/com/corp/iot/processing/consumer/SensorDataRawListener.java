package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.telemetry.SensorReadingProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

// Consume topic sensor-data-raw. Lỗi parse/xử lý log + skip, KHÔNG throw ra ngoài
// thread pool (CONVENTIONS.md § Error handling — async listener) — chưa có DLQ topic
// ở Phase 3, để Phase 9 Hardening.
@Slf4j
@Component
@RequiredArgsConstructor
public class SensorDataRawListener {

    private final ObjectMapper objectMapper;
    private final SensorReadingProcessor sensorReadingProcessor;

    @KafkaListener(topics = "${app.kafka.topic.sensor-data-raw}")
    public void onMessage(String payload) {
        SensorReadingEvent event;
        try {
            event = objectMapper.readValue(payload, SensorReadingEvent.class);
        } catch (Exception e) {
            log.error("Failed to parse sensor-data-raw payload={}", payload, e);
            return;
        }

        try {
            sensorReadingProcessor.process(event);
        } catch (Exception e) {
            log.error("Failed to process sensor reading messageId={}", event.messageId(), e);
        }
    }
}
