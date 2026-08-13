package com.corp.iot.processing.command;

import com.corp.iot.processing.entity.OutboxEvent;
import com.corp.iot.processing.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

// Outbox poller (xem ARCHITECTURE.md § Flow: Command / Relay control, bước 3) — quét
// outbox_event PENDING/FAILED tới hạn, publish topic = event_type, set status=PUBLISHED.
// Lỗi publish (Kafka down) -> giữ FAILED, next_attempt_at lùi 10s, retry vô hạn lần poll
// sau (khác chính sách retry-có-giới-hạn của MQTT dispatch, xem CommandDispatchService).
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxPollerService {

    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_FAILED = "FAILED";

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${app.command.outbox-poll-interval-ms}")
    public void poll() {
        List<OutboxEvent> due = outboxEventRepository.findDueForDispatch(Instant.now());
        for (OutboxEvent event : due) {
            publish(event);
        }
    }

    private void publish(OutboxEvent event) {
        try {
            String key = event.getPayloadJson().tenantId() + ":" + event.getPayloadJson().gatewayId();
            String payload = objectMapper.writeValueAsString(event.getPayloadJson());
            ProducerRecord<String, String> record = new ProducerRecord<>(event.getEventType(), key, payload);
            record.headers().add(new RecordHeader(
                    "correlation_id", event.getPayloadJson().commandId().toString().getBytes(StandardCharsets.UTF_8)));
            kafkaTemplate.send(record);

            event.setStatus(STATUS_PUBLISHED);
            outboxEventRepository.save(event);
        } catch (Exception e) {
            log.error("Failed to publish outbox event id={}", event.getId(), e);
            event.setStatus(STATUS_FAILED);
            event.setAttemptCount(event.getAttemptCount() + 1);
            event.setNextAttemptAt(Instant.now().plusSeconds(10));
            event.setLastError(e.getMessage());
            outboxEventRepository.save(event);
        }
    }
}
