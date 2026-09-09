package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.telemetry.ExternalReadingProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.listener.BatchListenerFailedException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

// Consume topic external-data-raw theo LÔ — cùng cách báo lỗi như SensorDataRawListener.
@Slf4j
@Component
@RequiredArgsConstructor
public class ExternalDataRawListener {

    private final ObjectMapper objectMapper;
    private final ExternalReadingProcessor externalReadingProcessor;

    @KafkaListener(topics = "${app.kafka.topic.external-data-raw}")
    public void onMessage(List<String> payloads) {
        List<ExternalReadingEvent> events = new ArrayList<>(payloads.size());
        for (int i = 0; i < payloads.size(); i++) {
            try {
                events.add(objectMapper.readValue(payloads.get(i), ExternalReadingEvent.class));
            } catch (Exception e) {
                log.error("Failed to parse external-data-raw payload={}", payloads.get(i), e);
                throw new BatchListenerFailedException("Payload external-data-raw không parse được", e, i);
            }
        }
        externalReadingProcessor.processBatch(events);
    }
}
