package com.corp.iot.processing.consumer;

import com.corp.iot.processing.command.CommandDispatchService;
import com.corp.iot.processing.dto.CommandOutboxPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

// Consume topic gateway-commands (do OutboxPollerService publish) -> dispatch MQTT xuống
// Gateway (xem ARCHITECTURE.md § Flow: Command / Relay control). Lỗi parse/xử lý log + skip,
// không throw ra ngoài thread pool, giống SensorDataRawListener.
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayCommandsListener {

    private final ObjectMapper objectMapper;
    private final CommandDispatchService commandDispatchService;

    @KafkaListener(topics = "${app.kafka.topic.gateway-commands}")
    public void onMessage(String payload) {
        CommandOutboxPayload event;
        try {
            event = objectMapper.readValue(payload, CommandOutboxPayload.class);
        } catch (Exception e) {
            log.error("Failed to parse gateway-commands payload={}", payload, e);
            return;
        }

        try {
            commandDispatchService.dispatch(event);
        } catch (Exception e) {
            log.error("Failed to dispatch commandId={}", event.commandId(), e);
        }
    }
}
