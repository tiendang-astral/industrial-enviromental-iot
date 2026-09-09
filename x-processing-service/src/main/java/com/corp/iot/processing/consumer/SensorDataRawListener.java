package com.corp.iot.processing.consumer;

import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.telemetry.SensorReadingProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.listener.BatchListenerFailedException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

/**
 * Consume topic sensor-data-raw theo LÔ (spring.kafka.listener.type=batch).
 *
 * Khác record listener cũ ở cách báo lỗi: message hỏng ném BatchListenerFailedException kèm CHỈ SỐ
 * trong lô, DefaultErrorHandler sẽ bỏ đúng message đó rồi chạy tiếp phần còn lại — bọc try/catch
 * quanh cả lô như trước sẽ khiến một message hỏng làm mất 499 message tốt.
 * Lỗi hạ tầng (InfluxDB/Redis) thì ném nguyên để container retry cả lô.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SensorDataRawListener {

    private final ObjectMapper objectMapper;
    private final SensorReadingProcessor sensorReadingProcessor;

    @KafkaListener(topics = "${app.kafka.topic.sensor-data-raw}")
    public void onMessage(List<String> payloads) {
        List<SensorReadingEvent> events = new ArrayList<>(payloads.size());
        for (int i = 0; i < payloads.size(); i++) {
            try {
                events.add(objectMapper.readValue(payloads.get(i), SensorReadingEvent.class));
            } catch (Exception e) {
                log.error("Failed to parse sensor-data-raw payload={}", payloads.get(i), e);
                throw new BatchListenerFailedException("Payload sensor-data-raw không parse được", e, i);
            }
        }
        sensorReadingProcessor.processBatch(events);
    }
}
